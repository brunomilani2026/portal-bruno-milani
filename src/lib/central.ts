import { chaveAluno, listarAnotacoes } from "./aulas";
import { listarRegistros, STORES, temTokenEscrita, temTokenLeitura, type RegistroMake } from "./make";

export type Nivel = "critico" | "importante" | "aguardar";

export type ItemCentral = {
  key: string;
  titulo: string;
  detalhe: string;
  area: string;
  origem: string;
  prazo: string;
  valor: number;
  /** nota final (base + ajuste manual) */
  score: number;
  scoreBase: number;
  ajuste: number;
  porque: string;
  href: string;
  whatsapp: string;
  nota: string;
  /** só aguardando */
  quem: string;
  ultimoContato: string;
  lembrarEm: string;
  /** só agenda */
  data: string;
  hora: string;
  /** só agenda de aulas: pedidos pendentes do aluno (música/assunto) */
  pedidos: string[];
  /** última gravação do assistente (usada para escolher o registro mais novo em duplicatas) */
  atualizadoEm: string;
  anotacao: boolean;
};

export type Resolvido = {
  key: string;
  titulo: string;
  area: string;
  status: "concluida" | "ignorada" | "adiada";
  adiadaAte: string;
};

export type MeuDia = {
  ok: boolean;
  erro?: string;
  podeEscrever: boolean;
  hoje: string;
  atualizadoEm: string;
  itens: ItemCentral[];
  aguardando: ItemCentral[];
  agenda: ItemCentral[];
  resumos: { key: string; titulo: string; detalhe: string }[];
  /** ordem sugerida para o dia (linhas de texto escritas pelo assistente) */
  plano: string[];
  tudoCerto: string[];
  resolvidos: Resolvido[];
  concluidosHoje: number;
  /** true quando a última atualização do assistente tem mais de 20 horas */
  desatualizado: boolean;
  /** true quando a cópia da agenda do Google Calendar (feita pelo Make a cada 15 min) tem mais de 45 minutos */
  agendaDesatualizada: boolean;
};

export function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diffDias(deISO: string, ateISO: string): number {
  return Math.round((Date.parse(`${ateISO.slice(0, 10)}T00:00:00Z`) - Date.parse(`${deISO.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
}

export function nivelDoScore(score: number): Nivel {
  return score >= 50 ? "critico" : score >= 25 ? "importante" : "aguardar";
}

const txt = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const limitar = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Mesma fórmula fixa usada pelo assistente (vencimento 50, valor 20, parado 15). */
function scoreCaptura(prazo: string, criadoEm: string, hoje: string): { score: number; porque: string } {
  let fVenc = 0.2;
  if (prazo) {
    const d = diffDias(hoje, prazo);
    fVenc = d <= 0 ? 1 : d === 1 ? 0.85 : d === 2 ? 0.7 : d === 3 ? 0.55 : d <= 5 ? 0.4 : d <= 10 ? 0.2 : 0.1;
  }
  const parado = criadoEm ? Math.min(1, Math.max(0, diffDias(criadoEm, hoje)) / 10) : 0;
  return { score: limitar(50 * fVenc + 15 * parado), porque: prazo ? "prazo anotado" : "anotado por você" };
}

function fatorVencimento(dias: number | null): number {
  if (dias === null) return 0.2;
  if (dias <= 0) return 1;
  if (dias === 1) return 0.85;
  if (dias === 2) return 0.7;
  if (dias === 3) return 0.55;
  if (dias <= 5) return 0.4;
  if (dias <= 10) return 0.2;
  return 0.1;
}

/**
 * Nota fixa 0–100: vencimento 50 + valor 20 + tempo parado 15 + terceiros 5 + oportunidade 25.
 * O assistente só fornece os dados (prazo, valor, datas); o cálculo é feito aqui, sempre com a data de hoje.
 */
function notaDoItem(i: ItemCentral, tipo: string, hoje: string, d: Record<string, unknown>): { score: number; porque: string } {
  const dias = i.prazo ? diffDias(hoje, i.prazo) : null;
  const atraso = dias !== null && dias < 0 ? -dias : 0;
  const criado = txt(d.criado_em);
  const idade = criado ? Math.max(0, diffDias(criado, hoje)) : 0;
  const parado = Math.max(atraso, i.origem === "ia" ? idade : 0);
  const terceiros = tipo === "aguardando" || d.terceiros === true;
  const oportunidade = i.key.startsWith("lead:") || d.oportunidade === true;

  const partes: [string, number][] = [
    ["vencimento", 50 * fatorVencimento(dias)],
    ["valor", 20 * Math.min(1, Math.max(0, i.valor) / 1000)],
    ["tempo parado", 15 * Math.min(1, parado / 10)],
    ["depende de terceiros", terceiros ? 5 : 0],
    ["oportunidade", oportunidade ? 25 : 0],
    ["saldo baixo", i.key.startsWith("saldo-baixo:") ? 20 : 0],
  ];
  const score = limitar(partes.reduce((s, [, p]) => s + p, 0));

  let quando = "";
  if (dias !== null) quando = dias < 0 ? `${-dias} dia${-dias === 1 ? "" : "s"} de atraso` : dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
  const extras = partes
    .filter(([n, p]) => p >= 5 && n !== "vencimento")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([n]) => n);
  const porque = [quando, ...extras].filter(Boolean).join(" · ") || "sem prazo";
  return { score, porque };
}

function oculto(status: Record<string, unknown> | undefined, hoje: string): boolean {
  if (!status) return false;
  const s = txt(status.status);
  if (s === "concluida" || s === "ignorada") return true;
  if (s === "adiada" && txt(status.adiada_ate) > hoje) return true;
  return false;
}

function vazio(key: string): ItemCentral {
  return {
    key, titulo: key, detalhe: "", area: "outro", origem: "", prazo: "", valor: 0, score: 0, scoreBase: 0, ajuste: 0, porque: "",
    href: "", whatsapp: "", nota: "", quem: "", ultimoContato: "", lembrarEm: "", data: "", hora: "", pedidos: [], atualizadoEm: "", anotacao: false,
  };
}

export async function carregarMeuDia(): Promise<MeuDia> {
  const hoje = hojeSP();
  const base: MeuDia = {
    ok: false,
    podeEscrever: temTokenEscrita(),
    hoje,
    atualizadoEm: "",
    itens: [],
    aguardando: [],
    agenda: [],
    resumos: [],
    plano: [],
    tudoCerto: [],
    resolvidos: [],
    concluidosHoje: 0,
    desatualizado: false,
    agendaDesatualizada: false,
  };

  if (!temTokenLeitura() && process.env.NODE_ENV !== "production") {
    // só em desenvolvimento: exemplo para conferir o visual sem o Make
    const ex = (key: string, titulo: string, detalhe: string, score: number, area: string, extra: Partial<ItemCentral> = {}): ItemCentral => ({
      ...vazio(key), titulo, detalhe, area, origem: "app", score, scoreBase: score, porque: "exemplo", ...extra,
    });
    return {
      ...base,
      ok: true,
      atualizadoEm: new Date().toISOString(),
      itens: [
        ex("aluno-atraso:Pipo:2026-09-16", "Cobrar Pipo", "Mensalidade R$ 450,00 venceu 16/09 (18 dias). WhatsApp +55 (11) 97375-0511", 74, "aulas", { valor: 450, prazo: "2026-09-16", whatsapp: "5511973750511" }),
        ex("b", "Pagar IPTU", "R$ 238,70 · vence amanhã", 52, "financeiro", { ajuste: 10, nota: "Pagar pelo app do banco" }),
        ex("c", "Saldo baixo: Conta Next", "R$ 840,36 (mínimo R$ 2.000,00)", 30, "financeiro"),
        ex("d", "Me lembrar de gravar uma música", "", 12, "pessoal", { anotacao: true, key: "captura:cx1" }),
      ],
      aguardando: [ex("e", "Reembolso", "Aguardando formulário", 24, "financeiro", { quem: "MuseScore", ultimoContato: "2026-10-01", lembrarEm: "2026-10-05" })],
      agenda: [
        ex("g1", "Jayden", "Aula", 0, "aulas", { data: hoje, hora: "11:00", pedidos: ["Samba de Roda — Trem das Onze"] }),
        ex("g2", "Show — Bar 80", "R$ 400,00", 0, "shows", { data: hoje, hora: "17:00" }),
        ex("g3", "Show — Casinha de Madeira", "R$ 400,00", 0, "shows", { data: somaDias(hoje, 1), hora: "23:30" }),
      ],
      resumos: [
        { key: "resumo:financeiro", titulo: "💰 Resumo financeiro", detalhe: "Saldo total das contas: R$ 7.800,00\nVence em 7 dias: R$ 1.845,70\nVence em 30 dias: R$ 3.100,00\nMensalidades atrasadas: R$ 1.050,00" },
        { key: "resumo:hotmart", titulo: "🛒 Hotmart", detalhe: "26 vendas aprovadas em 14 dias (R$ 742,03 líquidos)\nÚltima venda: 30/09" },
      ],
      plano: ["09:00 — Pagar IPTU e Barba (vencem amanhã)", "10:00 — Cobrar Pipo e Anderson no WhatsApp", "13:30 — Responder o lead quente do Cavaco"],
      tudoCerto: ["Hotmart — normal", "Campanhas Meta — sem anomalias", "Make — 3 cenários ativos"],
      resolvidos: [{ key: "x", titulo: "Saldo baixo: Cofrinho", area: "financeiro", status: "concluida", adiadaAte: "" }],
      concluidosHoje: 1,
    };
  }
  if (!temTokenLeitura()) return { ...base, erro: "A página ainda não está conectada ao Make (falta cadastrar a chave na Vercel)." };

  let tarefas: RegistroMake[];
  let status: RegistroMake[];
  let capturas: RegistroMake[];
  let pedidosAulas: Awaited<ReturnType<typeof listarAnotacoes>> = [];
  try {
    [tarefas, status, capturas, pedidosAulas] = await Promise.all([
      listarRegistros(STORES.tarefas),
      listarRegistros(STORES.status),
      listarRegistros(STORES.capturas),
      listarAnotacoes().catch(() => []),
    ]);
  } catch (e) {
    // o detalhe (ex.: "Make respondeu 403") não contém segredos e ajuda a diagnosticar
    const detalhe = e instanceof Error ? e.message : "erro desconhecido";
    return { ...base, erro: `Não consegui carregar os dados agora. Detalhe: ${detalhe}` };
  }

  const statusPorChave = new Map(status.map((r) => [r.key, r.data]));
  const amanha = somaDias(hoje, 1);
  const itens: ItemCentral[] = [];
  const aguardando: ItemCentral[] = [];
  const agenda: ItemCentral[] = [];
  const resumos: MeuDia["resumos"] = [];
  const agendaLegada: ItemCentral[] = [];
  const snapshotItens: ItemCentral[] = [];
  let snapshotEm = "";
  let plano: string[] = [];
  let tudoCerto: string[] = [];
  let atualizadoEm = "";

  for (const r of tarefas) {
    const d = r.data;
    const tipo = txt(d.tipo) || "tarefa";
    if (txt(d.atualizado_em) > atualizadoEm) atualizadoEm = txt(d.atualizado_em);

    if (tipo === "resumo") {
      resumos.push({ key: r.key, titulo: txt(d.titulo) || "Resumo", detalhe: txt(d.detalhe) });
      continue;
    }
    if (tipo === "plano") {
      plano = txt(d.detalhe).split("\n").map((l) => l.trim()).filter(Boolean);
      continue;
    }
    if (tipo === "ok") {
      tudoCerto = txt(d.detalhe).split("\n").map((l) => l.trim()).filter(Boolean);
      continue;
    }
    if (tipo === "alunos") continue; // lista de nomes usada só pela página de aulas
    if (tipo === "agendasnap") {
      // cópia da agenda do Google Calendar (hoje e amanhã), regravada pelo Make a cada 15 min: "data|hora|titulo|local|id" separados por ";;"
      snapshotEm = txt(d.atualizado_em);
      for (const linha of txt(d.detalhe).split(";;")) {
        const [data, hora, titulo, local, id] = linha.split("|");
        if (!data || !hora || !titulo) continue;
        if (data !== hoje && data !== amanha) continue;
        snapshotItens.push({
          ...vazio(`agenda:ev:${id || `${data}-${hora}-${titulo}`}`),
          titulo: titulo.trim(),
          detalhe: (local ?? "").trim() || "Aula",
          area: /show/i.test(titulo) ? "shows" : "aulas",
          origem: "app",
          data,
          hora,
          atualizadoEm: snapshotEm,
        });
      }
      continue;
    }

    const st = statusPorChave.get(r.key);
    const item: ItemCentral = {
      ...vazio(r.key),
      titulo: txt(d.titulo) || r.key,
      detalhe: txt(d.detalhe),
      area: txt(d.area) || "outro",
      origem: txt(d.origem),
      prazo: txt(d.prazo),
      valor: num(d.valor),
      scoreBase: num(d.score),
      porque: txt(d.porque),
      href: txt(d.href),
      whatsapp: txt(d.whatsapp),
      quem: txt(d.quem),
      ultimoContato: txt(d.ultimo_contato),
      lembrarEm: txt(d.lembrar_em),
      data: txt(d.data),
      hora: txt(d.hora),
      atualizadoEm: txt(d.atualizado_em),
      nota: st ? txt(st.nota) : "",
      ajuste: st ? num(st.prioridade) : 0,
    };
    if (tipo !== "agenda") {
      // nota calculada aqui (fórmula fixa e sempre atual), em vez de confiar na nota gravada pelo assistente
      const nota = notaDoItem(item, tipo, hoje, d);
      item.scoreBase = nota.score;
      item.porque = nota.porque;
    }
    item.score = limitar(item.scoreBase + item.ajuste);

    if (tipo === "agenda") {
      // tolerância: o assistente às vezes grava a data em `prazo` e a hora dentro do `detalhe` ("Aula · 11:00")
      if (!item.data) item.data = item.prazo;
      const horaNoDetalhe = item.detalhe.match(/(\d{1,2}):(\d{2})/);
      if (!item.hora && horaNoDetalhe) item.hora = `${horaNoDetalhe[1].padStart(2, "0")}:${horaNoDetalhe[2]}`;
      item.detalhe = item.detalhe.replace(/\s*[·\-—]?\s*\d{1,2}:\d{2}\s*$/, "").trim();
      if (item.data === hoje || item.data === amanha) agendaLegada.push(item);
      continue;
    }
    if (oculto(st, hoje)) continue;
    (tipo === "aguardando" ? aguardando : itens).push(item);
  }

  for (const r of capturas) {
    const chave = `captura:${r.key}`;
    const st = statusPorChave.get(chave);
    if (oculto(st, hoje)) continue;
    const d = r.data;
    const { score, porque } = scoreCaptura(txt(d.prazo), txt(d.criado_em), hoje);
    const ajuste = st ? num(st.prioridade) : 0;
    itens.push({
      ...vazio(chave),
      titulo: txt(d.texto) || "(sem texto)",
      area: txt(d.area) || "pessoal",
      origem: "captura",
      prazo: txt(d.prazo),
      scoreBase: score,
      ajuste,
      score: limitar(score + ajuste),
      porque,
      nota: st ? txt(st.nota) : "",
      anotacao: true,
    });
  }

  // A agenda vem da cópia do Google Calendar; só se ela não existir usa registros antigos do assistente.
  agenda.push(...(snapshotEm ? snapshotItens : agendaLegada));

  // Remove duplicatas deixadas por execuções diferentes do assistente:
  // - agenda: mesma data + hora + primeiro nome (ex.: "Julio" e "Julio 16" às 14:30);
  // - saldo baixo: mesma conta em dias diferentes. Fica sempre o registro mais recente.
  const unicos = <T extends ItemCentral>(lista: T[], chave: (i: T) => string): T[] => {
    const m = new Map<string, T>();
    for (const i of lista) {
      const k = chave(i);
      const outro = m.get(k);
      if (!outro || i.atualizadoEm > outro.atualizadoEm) m.set(k, i);
    }
    return Array.from(m.values());
  };
  const itensUnicos = unicos(itens, (i) => (i.key.startsWith("saldo-baixo:") ? `saldo:${i.key.split(":")[1]}` : i.key));
  const agendaUnica = unicos(agenda, (a) => `${a.data}|${a.hora}|${a.area === "aulas" ? chaveAluno(a.titulo) : a.titulo.toLowerCase()}`);
  itens.length = 0;
  itens.push(...itensUnicos);
  agenda.length = 0;
  agenda.push(...agendaUnica);

  itens.sort((a, b) => b.score - a.score);
  aguardando.sort((a, b) => ((a.lembrarEm || "9999") < (b.lembrarEm || "9999") ? -1 : 1));
  agenda.sort((a, b) => (a.data + a.hora < b.data + b.hora ? -1 : 1));
  for (const a of agenda) {
    if (a.area !== "aulas") continue;
    const k = chaveAluno(a.titulo);
    if (!k) continue;
    a.pedidos = pedidosAulas.filter((p) => p.status === "pendente" && chaveAluno(p.aluno) === k).map((p) => p.assunto);
  }

  const resolvidos: Resolvido[] = [];
  for (const r of status) {
    const s = txt(r.data.status);
    const feitoHoje = txt(r.data.atualizado_em).slice(0, 10) === hoje || txt(r.data.atualizado_em).slice(0, 10) === amanha;
    const adiada = s === "adiada" && txt(r.data.adiada_ate) > hoje;
    if ((s === "concluida" || s === "ignorada") && feitoHoje) {
      resolvidos.push({ key: r.key, titulo: txt(r.data.titulo) || r.key, area: txt(r.data.area), status: s as Resolvido["status"], adiadaAte: "" });
    } else if (adiada) {
      resolvidos.push({ key: r.key, titulo: txt(r.data.titulo) || r.key, area: txt(r.data.area), status: "adiada", adiadaAte: txt(r.data.adiada_ate) });
    }
  }
  const concluidosHoje = resolvidos.filter((x) => x.status === "concluida").length;

  const idadeMs = atualizadoEm ? Date.now() - Date.parse(atualizadoEm) : 0;
  const desatualizado = Boolean(atualizadoEm) && Number.isFinite(idadeMs) && idadeMs > 20 * 3_600_000;

  const idadeAgenda = snapshotEm ? Date.now() - Date.parse(snapshotEm) : 0;
  const agendaDesatualizada = Boolean(snapshotEm) && Number.isFinite(idadeAgenda) && idadeAgenda > 45 * 60_000;

  return { ...base, ok: true, itens, aguardando, agenda, resumos, plano, tudoCerto, resolvidos, concluidosHoje, atualizadoEm, desatualizado, agendaDesatualizada };
}
