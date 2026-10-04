"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, SESSAO_DIAS, criarToken, senhaConfere } from "@/lib/session";

export type EstadoLogin = { erro?: string };

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const senha = String(formData.get("senha") ?? "");

  // atraso fixo para dificultar tentativas em sequência
  await new Promise((r) => setTimeout(r, 900));

  if (!process.env.PORTAL_PASSWORD || process.env.PORTAL_PASSWORD.length < 12) {
    return { erro: "Configuração incompleta: PORTAL_PASSWORD ausente ou com menos de 12 caracteres." };
  }
  if (!process.env.PORTAL_SESSION_SECRET || process.env.PORTAL_SESSION_SECRET.length < 32) {
    return { erro: "Configuração incompleta: PORTAL_SESSION_SECRET ausente ou com menos de 32 caracteres." };
  }

  if (!senhaConfere(senha)) return { erro: "Senha incorreta." };

  const jar = await cookies();
  jar.set(COOKIE_NAME, criarToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSAO_DIAS * 86_400,
  });
  redirect("/");
}

export async function sair() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/login");
}
