"use server";

import { revalidatePath } from "next/cache";
import { hojeSP, somaDias } from "@/lib/central";
import { criarRegistro, gravarRegistro, STORES, temTokenEscrita } from "@/lib/make";

type Acao = "concluida" | "adiada" | "ignorada" | "aberta";

function str(f: FormData, nome: string): string {
  return String(f.get(nome) ?? "").trim();
}

async function marcar(key: string, status: Acao, dias?: number) {
  if (!key || !temTokenEscrita()) return;
  await gravarRegistro(STORES.status, key, {
    status,
    adiada_ate: status === "adiada" && dias ? somaDias(hojeSP(), dias) : "",
    nota: "",
    atualizado_em: new Date().toISOString(),
  });
  revalidatePath("/central");
}

export async function concluir(f: FormData) {
  await marcar(str(f, "key"), "concluida");
}

export async function adiar(f: FormData) {
  const dias = Math.max(1, Math.min(30, Number(str(f, "dias")) || 1));
  await marcar(str(f, "key"), "adiada", dias);
}

export async function ignorar(f: FormData) {
  await marcar(str(f, "key"), "ignorada");
}

export async function anotar(f: FormData) {
  const texto = str(f, "texto").slice(0, 500);
  if (!texto || !temTokenEscrita()) return;
  const prazo = /^\d{4}-\d{2}-\d{2}$/.test(str(f, "prazo")) ? str(f, "prazo") : "";
  const area = ["aulas", "shows", "hotmart", "financeiro", "cavaco", "pessoal", "outro"].includes(str(f, "area")) ? str(f, "area") : "pessoal";
  const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await criarRegistro(STORES.capturas, id, { texto, area, prazo, criado_em: new Date().toISOString() });
  revalidatePath("/central");
}
