export type Briefing = {
  data: string;
  titulo: string;
  resumo: string;
  urgentes: number;
  conteudo: string;
  criadoEm: string;
};

export type ResultadoBriefings =
  | { ok: true; briefings: Briefing[] }
  | { ok: false; motivo: "sem-token" | "erro"; detalhe?: string };

const ZONA = process.env.MAKE_ZONE || "us2.make.com";
const DATA_STORE = process.env.MAKE_DATASTORE_BRIEFING || "164483";

type RegistroBruto = { key?: string; data?: Record<string, unknown> } & Record<string, unknown>;

function texto(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizar(r: RegistroBruto): Briefing | null {
  const d = (r.data && typeof r.data === "object" ? r.data : r) as Record<string, unknown>;
  const data = texto(d.data) || texto(r.key).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const conteudo = texto(d.conteudo);
  if (!conteudo) return null;
  return {
    data,
    titulo: texto(d.titulo) || `Briefing — ${data}`,
    resumo: texto(d.resumo),
    urgentes: Number(d.urgentes) || 0,
    conteudo,
    criadoEm: texto(d.criado_em),
  };
}

const EXEMPLO: Briefing = {
  data: "2026-10-04",
  titulo: "☀️ Briefing (exemplo de desenvolvimento)",
  resumo: "3 urgentes · 2 shows amanhã · R$ 1.845,70 vencendo em 5 dias",
  urgentes: 3,
  conteudo:
    "☀️ BRIEFING — domingo, 04/10/2026\n\n🔴 PRECISA DA SUA ATENÇÃO\n\n1. Exemplo: cobrar aluno com mensalidade atrasada.\n\n2. Exemplo: responder lead quente.\n\n📅 AGENDA\n\n17:00 — Show — Bar 80\n\n✅ ESTÁ TUDO CERTO\n\nHotmart normal · Campanhas dentro do padrão",
  criadoEm: "2026-10-04T08:35:00-03:00",
};

export async function listarBriefings(): Promise<ResultadoBriefings> {
  const token = process.env.MAKE_API_TOKEN;
  if (!token) {
    // só em desenvolvimento: mostra um exemplo para conferir o visual
    if (process.env.NODE_ENV !== "production") return { ok: true, briefings: [EXEMPLO] };
    return { ok: false, motivo: "sem-token" };
  }

  try {
    const res = await fetch(`https://${ZONA}/api/v2/data-stores/${DATA_STORE}/data?pg%5Blimit%5D=100`, {
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, motivo: "erro", detalhe: `Make respondeu ${res.status}` };

    const json = (await res.json()) as { records?: RegistroBruto[] } | RegistroBruto[];
    const lista = Array.isArray(json) ? json : (json.records ?? []);
    const briefings = lista
      .map(normalizar)
      .filter((b): b is Briefing => b !== null)
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.criadoEm < b.criadoEm ? 1 : -1));

    // se houver mais de um registro no mesmo dia, mantém só o mais recente
    const vistos = new Set<string>();
    const unicos = briefings.filter((b) => (vistos.has(b.data) ? false : (vistos.add(b.data), true)));
    return { ok: true, briefings: unicos };
  } catch (e) {
    return { ok: false, motivo: "erro", detalhe: e instanceof Error ? e.message : "falha de rede" };
  }
}

export function formatarDataLonga(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const t = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}
