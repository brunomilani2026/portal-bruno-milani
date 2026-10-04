import { listarRegistros, STORES, temTokenEscrita, temTokenLeitura } from "./make";

export type Anotacao = {
  id: string;
  aluno: string;
  assunto: string;
  observacoes: string;
  link: string;
  status: "pendente" | "feito";
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
};

const txt = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

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

export async function listarAnotacoes(): Promise<Anotacao[]> {
  const regs = await listarRegistros(STORES.aulas);
  return regs
    .filter((r) => txt(r.data.status) !== "apagado" && txt(r.data.assunto))
    .map((r): Anotacao => {
      const d = r.data;
      return {
        id: r.key,
        aluno: txt(d.aluno),
        assunto: txt(d.assunto),
        observacoes: txt(d.observacoes),
        link: txt(d.link),
        status: txt(d.status) === "feito" ? "feito" : "pendente",
        criadoEm: txt(d.criado_em),
        atualizadoEm: txt(d.atualizado_em),
      };
    })
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
}

export async function carregarAulas(): Promise<DadosAulas> {
  const base: DadosAulas = { ok: false, podeEscrever: temTokenEscrita(), anotacoes: [], alunos: [] };

  if (!temTokenLeitura() && process.env.NODE_ENV !== "production") {
    return {
      ...base,
      ok: true,
      alunos: ["Jayden", "Julio", "Marcelo", "Paula", "Pipo"],
      anotacoes: [
        {
          id: "ex1", aluno: "Jayden", assunto: "Samba de Roda — Trem das Onze", observacoes: "Quer aprender a introdução e o ritmo da levada.",
          link: "https://www.youtube.com/watch?v=exemplo", status: "pendente", criadoEm: "2026-10-04T12:00:00-03:00", atualizadoEm: "",
        },
        {
          id: "ex2", aluno: "Julio", assunto: "Escala menor harmônica", observacoes: "", link: "", status: "pendente", criadoEm: "2026-10-03T12:00:00-03:00", atualizadoEm: "",
        },
        {
          id: "ex3", aluno: "Paula", assunto: "Cifra de Detalhes", observacoes: "Enviei por e-mail", link: "", status: "feito", criadoEm: "2026-10-01T12:00:00-03:00", atualizadoEm: "",
        },
      ],
    };
  }
  if (!temTokenLeitura()) return { ...base, erro: "A página ainda não está conectada ao Make (falta cadastrar a chave na Vercel)." };

  try {
    const [anotacoes, tarefas] = await Promise.all([listarAnotacoes(), listarRegistros(STORES.tarefas)]);
    const lista = tarefas.find((r) => r.key === "lista:alunos");
    const doAssistente = txt(lista?.data.detalhe)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const usados = anotacoes.map((a) => a.aluno).filter(Boolean);
    const alunos = Array.from(new Set([...doAssistente, ...usados])).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { ...base, ok: true, anotacoes, alunos };
  } catch (e) {
    return { ...base, erro: `Não consegui carregar as anotações agora. Detalhe: ${e instanceof Error ? e.message : "erro desconhecido"}` };
  }
}
