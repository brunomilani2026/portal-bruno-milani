"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hojeSP, somaDias } from "@/lib/central";
import { apagarRegistros, criarRegistro, gravarRegistro, listarRegistros, STORES, temTokenEscrita } from "@/lib/make";

type Dados = Record<string, unknown>;
const AREAS = ["aulas", "shows", "hotmart", "financeiro", "cavaco", "pessoal", "outro"];

function str(f: FormData, nome: string): string {
  return String(f.get(nome) ?? "").trim();
}

function areaValida(a: string): string {
  return AREAS.includes(a) ? a : "outro";
}

async function statusAtual(key: string): Promise<Dados> {
  const todos = await listarRegistros(STORES.status);
  return todos.find((r) => r.key === key)?.data ?? {};
}

/** Mescla o status existente com as mudanças pedidas e grava. */
async function salvarStatus(f: FormData, mudar: (atual: Dados) => Dados): Promise<boolean> {
  const key = str(f, "key");
  if (!key || !temTokenEscrita()) return false;
  try {
    const bruto = await statusAtual(key);
    // o Make devolve campos vazios como null; ao regravar, trocamos por valores vazios válidos
    const atual = Object.fromEntries(Object.entries(bruto).map(([k, v]) => [k, v === null ? (k === "prioridade" ? 0 : "") : v]));
    const titulo = str(f, "titulo");
    const area = str(f, "area");
    await gravarRegistro(STORES.status, key, {
      status: "aberta",
      adiada_ate: "",
      nota: "",
      prioridade: 0,
      titulo: "",
      area: "",
      ...atual,
      ...(titulo ? { titulo: titulo.slice(0, 200) } : {}),
      ...(area ? { area } : {}),
      ...mudar(atual),
      atualizado_em: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sucesso: só revalida os dados, SEM redirecionar. Assim a página é atualizada no lugar:
 * a rolagem e as seções abertas/fechadas continuam como estavam.
 * Falha: volta para a página com um aviso.
 */
function terminar(ok: boolean): void {
  if (ok) {
    revalidatePath("/central");
    return;
  }
  redirect("/central?erro=acao");
}

export async function concluir(f: FormData) {
  terminar(await salvarStatus(f, () => ({ status: "concluida", adiada_ate: "" })));
}

export async function adiar(f: FormData) {
  const dias = Math.max(1, Math.min(30, Number(str(f, "dias")) || 1));
  terminar(await salvarStatus(f, () => ({ status: "adiada", adiada_ate: somaDias(hojeSP(), dias) })));
}

export async function ignorar(f: FormData) {
  terminar(await salvarStatus(f, () => ({ status: "ignorada", adiada_ate: "" })));
}

export async function adiarAte(f: FormData) {
  const data = str(f, "ate");
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(data) && data > hojeSP();
  if (!valida) return terminar(false);
  terminar(await salvarStatus(f, () => ({ status: "adiada", adiada_ate: data })));
}

export async function reabrir(f: FormData) {
  terminar(await salvarStatus(f, () => ({ status: "aberta", adiada_ate: "" })));
}

export async function salvarNota(f: FormData) {
  const nota = str(f, "nota").slice(0, 500);
  terminar(await salvarStatus(f, () => ({ nota })));
}

export async function ajustarPrioridade(f: FormData) {
  const delta = Number(str(f, "delta")) || 0;
  terminar(
    await salvarStatus(f, (atual) => ({
      prioridade: Math.max(-50, Math.min(50, (Number(atual.prioridade) || 0) + delta)),
    })),
  );
}

export async function anotar(f: FormData) {
  const texto = str(f, "texto").slice(0, 500);
  if (!texto || !temTokenEscrita()) return terminar(false);
  const prazoBruto = str(f, "prazo");
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(prazoBruto) ? prazoBruto : "";
  const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  let ok = false;
  try {
    await criarRegistro(STORES.capturas, id, { texto, area: areaValida(str(f, "area") || "pessoal"), prazo, criado_em: new Date().toISOString() });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(ok);
}

export async function editarAnotacao(f: FormData) {
  const chave = str(f, "key");
  const id = chave.startsWith("captura:") ? chave.slice(8) : "";
  const texto = str(f, "texto").slice(0, 500);
  if (!id || !texto || !temTokenEscrita()) return terminar(false);
  const prazoBruto = str(f, "prazo");
  let ok = false;
  try {
    const todos = await listarRegistros(STORES.capturas);
    const atual = todos.find((r) => r.key === id)?.data ?? {};
    await gravarRegistro(STORES.capturas, id, {
      texto,
      // o formulário tem um "area" oculto (área antiga) e o seletor (nova); vale o último
      area: areaValida(String(f.getAll("area").at(-1) ?? "").trim() || "pessoal"),
      prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazoBruto) ? prazoBruto : "",
      criado_em: typeof atual.criado_em === "string" ? atual.criado_em : new Date().toISOString(),
    });
    ok = true;
  } catch {
    ok = false;
  }
  terminar(ok);
}

export async function apagarAnotacao(f: FormData) {
  const chave = str(f, "key");
  const id = chave.startsWith("captura:") ? chave.slice(8) : "";
  if (!id || !temTokenEscrita()) return terminar(false);
  let ok = false;
  try {
    await apagarRegistros(STORES.capturas, [id]);
    ok = true;
  } catch {
    // se o Make recusar a exclusão, esconde a anotação marcando como ignorada
    ok = await salvarStatus(f, () => ({ status: "ignorada", adiada_ate: "" }));
  }
  terminar(ok);
}
