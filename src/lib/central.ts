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
  score: number;
  porque: string;
  href: string;
  /** só para tipo "aguardando" */
  quem: string;
  ultimoContato: string;
  lembrarEm: string;
  anotacao: boolean;
};

export type MeuDia = {
  ok: boolean;
  erro?: string;
  podeEscrever: boolean;
  hoje: string;
  atualizadoEm: string;
  itens: ItemCentral[];
  aguardando: ItemCentral[];
  concluidosHoje: number;
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

/** Mesma fórmula fixa usada pelo assistente (vencimento 50, valor 20, parado 15). */
function scoreCaptura(prazo: string, criadoEm: string, hoje: string): { score: number; porque: string } {
  let fVenc = 0.2;
  if (prazo) {
    const d = diffDias(hoje, prazo);
    fVenc = d <= 0 ? 1 : d === 1 ? 0.85 : d === 2 ? 0.7 : d === 3 ? 0.55 : d <= 5 ? 0.4 : d <= 10 ? 0.2 : 0.1;
  }
  const parado = criadoEm ? Math.min(1, Math.max(0, diffDias(criadoEm, hoje)) / 10) : 0;
  const pts = 50 * fVenc + 15 * parado;
  return { score: Math.round(Math.min(100, pts)), porque: prazo ? "prazo anotado" : "anotado por você" };
}

function oculto(status: Record<string, unknown> | undefined, hoje: string): boolean {
  if (!status) return false;
  const s = txt(status.status);
  if (s === "concluida" || s === "ignorada") return true;
  if (s === "adiada" && txt(status.adiada_ate) > hoje) return true;
  return false;
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
    concluidosHoje: 0,
  };
  if (!temTokenLeitura()) return { ...base, erro: "A página ainda não está conectada ao Make (falta cadastrar a chave na Vercel)." };

  let tarefas: RegistroMake[];
  let status: RegistroMake[];
  let capturas: RegistroMake[];
  try {
    [tarefas, status, capturas] = await Promise.all([
      listarRegistros(STORES.tarefas),
      listarRegistros(STORES.status),
      listarRegistros(STORES.capturas),
    ]);
  } catch (e) {
    // o detalhe (ex.: "Make respondeu 403") não contém segredos e ajuda a diagnosticar
    const detalhe = e instanceof Error ? e.message : "erro desconhecido";
    return { ...base, erro: `Não consegui carregar os dados agora. Detalhe: ${detalhe}` };
  }

  const statusPorChave = new Map(status.map((r) => [r.key, r.data]));
  const itens: ItemCentral[] = [];
  const aguardando: ItemCentral[] = [];
  let atualizadoEm = "";

  for (const r of tarefas) {
    const d = r.data;
    if (oculto(statusPorChave.get(r.key), hoje)) continue;
    const item: ItemCentral = {
      key: r.key,
      titulo: txt(d.titulo) || r.key,
      detalhe: txt(d.detalhe),
      area: txt(d.area) || "outro",
      origem: txt(d.origem),
      prazo: txt(d.prazo),
      valor: num(d.valor),
      score: num(d.score),
      porque: txt(d.porque),
      href: txt(d.href),
      quem: txt(d.quem),
      ultimoContato: txt(d.ultimo_contato),
      lembrarEm: txt(d.lembrar_em),
      anotacao: false,
    };
    if (txt(d.atualizado_em) > atualizadoEm) atualizadoEm = txt(d.atualizado_em);
    (txt(d.tipo) === "aguardando" ? aguardando : itens).push(item);
  }

  for (const r of capturas) {
    const chave = `captura:${r.key}`;
    if (oculto(statusPorChave.get(chave), hoje)) continue;
    const d = r.data;
    const { score, porque } = scoreCaptura(txt(d.prazo), txt(d.criado_em), hoje);
    itens.push({
      key: chave,
      titulo: txt(d.texto) || "(sem texto)",
      detalhe: "",
      area: txt(d.area) || "pessoal",
      origem: "captura",
      prazo: txt(d.prazo),
      valor: 0,
      score,
      porque,
      href: "",
      quem: "",
      ultimoContato: "",
      lembrarEm: "",
      anotacao: true,
    });
  }

  itens.sort((a, b) => b.score - a.score);
  aguardando.sort((a, b) => (a.lembrarEm || "9999") < (b.lembrarEm || "9999") ? -1 : 1);

  const concluidosHoje = status.filter((r) => txt(r.data.status) === "concluida" && txt(r.data.atualizado_em).slice(0, 10) === hoje).length;

  return { ...base, ok: true, itens, aguardando, atualizadoEm, concluidosHoje };
}
