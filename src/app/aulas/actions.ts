"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { linkSeguro } from "@/lib/aulas";
import { apagarRegistros, criarRegistro, gravarRegistro, listarRegistros, STORES, temTokenEscrita } from "@/lib/make";

function str(f: FormData, nome: string, max: number): string {
  return String(f.get(nome) ?? "").trim().slice(0, max);
}

function terminar(ok: boolean, aluno = ""): never {
  const q = new URLSearchParams();
  if (!ok) q.set("erro", "acao");
  if (aluno) q.set("aluno", aluno);
  if (ok) revalidatePath("/aulas");
  const s = q.toString();
  redirect(s ? `/aulas?${s}` : "/aulas");
}

async function atual(id: string): Promise<Record<string, unknown>> {
  const todos = await listarRegistros(STORES.aulas);
  return todos.find((r) => r.key === id)?.data ?? {};
}

export async function criarAnotacao(f: FormData) {
  const aluno = str(f, "aluno", 80);
  const assunto = str(f, "assunto", 200);
  if (!aluno || !assunto || !temTokenEscrita()) return terminar(false);
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
      criado_em: agora,
      atualizado_em: agora,
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(ok, str(f, "filtro", 80));
}

export async function editarAnotacao(f: FormData) {
  const id = str(f, "id", 80);
  const aluno = str(f, "aluno", 80);
  const assunto = str(f, "assunto", 200);
  if (!id || !aluno || !assunto || !temTokenEscrita()) return terminar(false);
  let ok = false;
  try {
    const a = await atual(id);
    await gravarRegistro(STORES.aulas, id, {
      aluno,
      assunto,
      observacoes: str(f, "observacoes", 1000),
      link: linkSeguro(str(f, "link", 500)),
      status: typeof a.status === "string" ? a.status : "pendente",
      criado_em: typeof a.criado_em === "string" ? a.criado_em : new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(ok, str(f, "filtro", 80));
}

export async function mudarStatus(f: FormData) {
  const id = str(f, "id", 80);
  const novo = str(f, "status", 20) === "feito" ? "feito" : "pendente";
  if (!id || !temTokenEscrita()) return terminar(false);
  let ok = false;
  try {
    const a = await atual(id);
    await gravarRegistro(STORES.aulas, id, {
      aluno: typeof a.aluno === "string" ? a.aluno : "",
      assunto: typeof a.assunto === "string" ? a.assunto : "",
      observacoes: typeof a.observacoes === "string" ? a.observacoes : "",
      link: typeof a.link === "string" ? a.link : "",
      status: novo,
      criado_em: typeof a.criado_em === "string" ? a.criado_em : new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(ok, str(f, "filtro", 80));
}

export async function apagarAnotacao(f: FormData) {
  const id = str(f, "id", 80);
  if (!id || !temTokenEscrita()) return terminar(false);
  let ok = false;
  try {
    await apagarRegistros(STORES.aulas, [id]);
    ok = true;
  } catch {
    // se o Make recusar a exclusão, esconde a anotação marcando como "apagado"
    try {
      const a = await atual(id);
      await gravarRegistro(STORES.aulas, id, { ...a, status: "apagado", atualizado_em: new Date().toISOString() });
      ok = true;
    } catch {
      ok = false;
    }
  }
  terminar(ok, str(f, "filtro", 80));
}
