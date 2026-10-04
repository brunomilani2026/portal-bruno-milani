import { listarRegistros, STORES, temTokenEscrita, temTokenLeitura } from "./make";

export const TIPOS = [
  { valor: "musica", rotulo: "🎵 Música" },
  { valor: "tecnica", rotulo: "🎸 Técnica" },
  { valor: "teoria", rotulo: "📖 Teoria" },
  { valor: "apresentacao", rotulo: "🎤 Apresentação" },
] as const;

export type Tipo = (typeof TIPOS)[number]["valor"];

export type Anotacao = {
  id: string;
  aluno: string;
  assunto: string;
  observacoes: string;
  link: string;
  status: "pendente" | "feito";
  tipo: Tipo;
  tom: string;
  prioridade: "normal" | "alta";
  feitoEm: string;
  posAula: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type DadosAulas = {
  ok: boolean;
  erro?: string;
  podeEscrever: boolean;
  anotacoes: Anotacao[];
  /** nomes para sugestão: alunos ativos (lista do assistente) + nomes já usados nas anotações */
  alunos: string[];
  /** próxima aula de cada aluno (chave = primeiro nome sem acento) em ISO, gravada pelo assistente a partir do Calendar */
  proximas: Record<string, string>;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "qui 08/10 14:00" no fuso de São Paulo. */
export function rotuloAula(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dia = g("weekday").replace(".", "").toLowerCase() || DIAS_SEMANA[d.getDay()];
  return `${dia} ${g("day")}/${g("month")} ${g("hour")}:${g("minute")}`;
}

/** Dias inteiros (calendário de São Paulo) entre hoje e a data; 0 = hoje, 1 = amanhã. */
export function diasAte(iso: string, agora = new Date()): number {
  const f = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  const a = new Date(f(agora) + "T00:00:00Z").getTime();
  const b = new Date(f(new Date(iso)) + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

export function textoPrazo(dias: number): string {
  return dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
}

const txt = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

export function tipoValido(v: string): Tipo {
  return TIPOS.some((t) => t.valor === v) ? (v as Tipo) : "musica";
}

export function rotuloTipo(t: Tipo): string {
  return TIPOS.find((x) => x.valor === t)?.rotulo ?? "🎵 Música";
}

/** Só aceita endereços http(s); qualquer outra coisa vira vazio. */
export function linkSeguro(bruto: string): string {
  const t = bruto.trim();
  if (!t) return "";
  const comEsquema = /^https?:\/\//i.test(t) ? t : /^[\w-]+(\.[\w-]+)+/.test(t) ? `https://${t}` : "";
  try {
    const u = new URL(comEsquema);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function nomeDoLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

/** Devolve o id do vídeo quando o link é do YouTube (para mostrar a miniatura). */
export function idYoutube(link: string): string {
  try {
    const u = new URL(link);
    const h = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
    let id = "";
    if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? "";
    else if (h === "youtube.com" || h === "music.youtube.com") {
      id = u.searchParams.get("v") ?? "";
      if (!id) {
        const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
        id = m?.[1] ?? "";
      }
    }
    return /^[\w-]{11}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

/** Atalhos de busca prontos para a música/assunto (abrem em nova aba). */
export function buscas(assunto: string): { rotulo: string; href: string }[] {
  const q = encodeURIComponent(assunto);
  return [
    { rotulo: "▶ YouTube", href: `https://www.youtube.com/results?search_query=${q}` },
    { rotulo: "🎸 Cifra", href: `https://www.cifraclub.com.br/?q=${q}` },
    { rotulo: "🎼 Partitura", href: `https://www.google.com/search?q=${encodeURIComponent(`${assunto} partitura`)}` },
  ];
}

/** Primeiro nome em minúsculas e sem acento/número, para casar "Julio 16" com "Julio". */
export function chaveAluno(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim()
    .split(/\s+/)[0] ?? "";
}

/** Entrada rápida: "Iuri – Amor de Verão" vira aluno + assunto. */
export function separarRapido(bruto: string): { aluno: string; assunto: string } | null {
  const t = bruto.trim();
  const m = t.match(/^(.+?)\s*(?:\s[-–—]\s|:)\s*(.+)$/);
  if (!m) return null;
  const aluno = m[1].trim();
  const assunto = m[2].trim();
  return aluno && assunto ? { aluno, assunto } : null;
}

export function diasDesde(iso: string, agora = new Date()): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((agora.getTime() - d.getTime()) / 86_400_000));
}

export async function listarAnotacoes(): Promise<Anotacao[]> {
  const regs = await listarRegistros(STORES.aulas);
  return regs
    .filter((r) => !r.key.startsWith("proxima:") && txt(r.data.status) !== "apagado" && txt(r.data.assunto))
    .map((r): Anotacao => {
      const d = r.data;
      return {
        id: r.key,
        aluno: txt(d.aluno),
        assunto: txt(d.assunto),
        observacoes: txt(d.observacoes),
        link: txt(d.link),
        status: txt(d.status) === "feito" ? "feito" : "pendente",
        tipo: tipoValido(txt(d.tipo)),
        tom: txt(d.tom),
        prioridade: txt(d.prioridade) === "alta" ? "alta" : "normal",
        feitoEm: txt(d.feito_em),
        posAula: txt(d.pos_aula),
        criadoEm: txt(d.criado_em),
        atualizadoEm: txt(d.atualizado_em),
      };
    })
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export async function carregarAulas(): Promise<DadosAulas> {
  const base: DadosAulas = { ok: false, podeEscrever: temTokenEscrita(), anotacoes: [], alunos: [], proximas: {} };

  if (!temTokenLeitura() && process.env.NODE_ENV !== "production") {
    const ex = (o: Partial<Anotacao> & Pick<Anotacao, "id" | "aluno" | "assunto" | "criadoEm">): Anotacao => ({
      observacoes: "", link: "", status: "pendente", tipo: "musica", tom: "", prioridade: "normal", feitoEm: "", posAula: "", atualizadoEm: "", ...o,
    });
    return {
      ...base,
      ok: true,
      alunos: ["Jayden", "Julio", "Marcelo", "Paula", "Pipo"],
      proximas: { jayden: new Date(Date.now() + 2 * 86_400_000).toISOString(), julio: new Date(Date.now() + 5 * 86_400_000).toISOString() },
      anotacoes: [
        ex({ id: "ex1", aluno: "Jayden", assunto: "Samba de Roda — Trem das Onze", observacoes: "Quer aprender a introdução e o ritmo da levada.", link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tom: "Dó maior", prioridade: "alta", criadoEm: "2026-10-04T12:00:00-03:00" }),
        ex({ id: "ex2", aluno: "Julio", assunto: "Escala menor harmônica", tipo: "teoria", criadoEm: "2026-09-12T12:00:00-03:00" }),
        ex({ id: "ex3", aluno: "Paula", assunto: "Cifra de Detalhes", observacoes: "Enviei por e-mail", status: "feito", feitoEm: "2026-10-02T12:00:00-03:00", posAula: "Treinar a virada do refrão.", criadoEm: "2026-10-01T12:00:00-03:00" }),
      ],
    };
  }
  if (!temTokenLeitura()) return { ...base, erro: "A página ainda não está conectada ao Make (falta cadastrar a chave na Vercel)." };

  try {
    const [anotacoes, tarefas, regsAulas] = await Promise.all([listarAnotacoes(), listarRegistros(STORES.tarefas), listarRegistros(STORES.aulas)]);
    const proximas: Record<string, string> = {};
    const agora = Date.now();
    for (const r of regsAulas) {
      if (!r.key.startsWith("proxima:")) continue;
      const iso = txt(r.data.proxima_aula);
      const t = new Date(iso).getTime();
      // aula que já passou há mais de 1 dia não serve mais (o assistente atualiza a cada execução)
      if (!Number.isNaN(t) && t > agora - 86_400_000) proximas[chaveAluno(txt(r.data.aluno) || r.key.slice(8))] = iso;
    }
    const lista = tarefas.find((r) => r.key === "lista:alunos");
    const doAssistente = txt(lista?.data.detalhe)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const usados = anotacoes.map((a) => a.aluno).filter(Boolean);
    const alunos = Array.from(new Set([...doAssistente, ...usados])).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { ...base, ok: true, anotacoes, alunos, proximas };
  } catch (e) {
    return { ...base, erro: `Não consegui carregar as anotações agora. Detalhe: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}
