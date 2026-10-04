"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { linkSeguro, separarRapido, tipoValido } from "@/lib/aulas";
import { apagarRegistros, criarRegistro, gravarRegistro, listarRegistros, STORES, temTokenEscrita } from "@/lib/make";

function str(f: FormData, nome: string, max: number): string {
  return String(f.get(nome) ?? "").trim().slice(0, max);
}

/** Mantém só os filtros conhecidos ao voltar para a página. */
function voltarQuery(f: FormData, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  try {
    const de = new URLSearchParams(String(f.get("voltar") ?? ""));
    for (const k of ["aluno", "tipo", "q", "ordem"]) {
      const v = (de.get(k) ?? "").slice(0, 80);
      if (v) q.set(k, v);
    }
  } catch {
    // ignora
  }
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

function terminar(f: FormData, ok: boolean, motivo = "acao"): never {
  const s = voltarQuery(f, ok ? {} : { erro: motivo });
  if (ok) revalidatePath("/aulas");
  redirect(s ? `/aulas?${s}` : "/aulas");
}

async function atual(id: string): Promise<Record<string, unknown>> {
  const todos = await listarRegistros(STORES.aulas);
  return todos.find((r) => r.key === id)?.data ?? {};
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");

/** Regrava o registro mantendo o que já existia e aplicando as mudanças. */
async function atualizar(id: string, mudancas: Record<string, unknown>): Promise<void> {
  const a = await atual(id);
  await gravarRegistro(STORES.aulas, id, {
    ...a,
    ...mudancas,
    criado_em: s(a.criado_em) || new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
}

export async function criarAnotacao(f: FormData) {
  if (!temTokenEscrita()) return terminar(f, false);
  let aluno = str(f, "aluno", 80);
  let assunto = str(f, "assunto", 200);
  if (!aluno || !assunto) {
    const r = separarRapido(str(f, "rapido", 300));
    if (!r) return terminar(f, false, "formato");
    aluno = r.aluno.slice(0, 80);
    assunto = r.assunto.slice(0, 200);
  }
  const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const agora = new Date().toISOString();
  let ok = false;
  try {
    await criarRegistro(STORES.aulas, id, {
      aluno,
      assunto,
      observacoes: str(f, "observacoes", 1000),
      link: linkSeguro(str(f, "link", 500)),
      status: "pendente",
      tipo: tipoValido(str(f, "tipo", 20)),
      tom: str(f, "tom", 60),
      prioridade: str(f, "prioridade", 10) === "alta" ? "alta" : "normal",
      feito_em: "",
      pos_aula: "",
      criado_em: agora,
      atualizado_em: agora,
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(f, ok);
}

export async function editarAnotacao(f: FormData) {
  const id = str(f, "id", 80);
  const aluno = str(f, "aluno", 80);
  const assunto = str(f, "assunto", 200);
  if (!id || !aluno || !assunto || !temTokenEscrita()) return terminar(f, false);
  let ok = false;
  try {
    await atualizar(id, {
      aluno,
      assunto,
      observacoes: str(f, "observacoes", 1000),
      link: linkSeguro(str(f, "link", 500)),
      tipo: tipoValido(str(f, "tipo", 20)),
      tom: str(f, "tom", 60),
      prioridade: str(f, "prioridade", 10) === "alta" ? "alta" : "normal",
      pos_aula: str(f, "pos_aula", 1000),
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(f, ok);
}

export async function mudarStatus(f: FormData) {
  const id = str(f, "id", 80);
  const feito = str(f, "status", 20) === "feito";
  if (!id || !temTokenEscrita()) return terminar(f, false);
  let ok = false;
  try {
    await atualizar(id, { status: feito ? "feito" : "pendente", feito_em: feito ? new Date().toISOString() : "" });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(f, ok);
}

export async function apagarAnotacao(f: FormData) {
  const id = str(f, "id", 80);
  if (!id || !temTokenEscrita()) return terminar(f, false);
  let ok = false;
  try {
    await apagarRegistros(STORES.aulas, [id]);
    ok = true;
  } catch {
    // se o Make recusar a exclusão, esconde a anotação marcando como "apagado"
    try {
      await atualizar(id, { status: "apagado" });
      ok = true;
    } catch {
      ok = false;
    }
  }
  terminar(f, ok);
}
