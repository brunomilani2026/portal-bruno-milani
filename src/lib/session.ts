import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "bm_portal";
export const SESSAO_DIAS = 30;

function segredo(): string {
  const s = process.env.PORTAL_SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("PORTAL_SESSION_SECRET ausente ou curto (mínimo 32 caracteres).");
  return s;
}

function assinar(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

export function criarToken(): string {
  const expira = String(Date.now() + SESSAO_DIAS * 86_400_000);
  return `${expira}.${assinar(expira)}`;
}

/** Falha sempre "fechada": qualquer erro de configuração ou token inválido = não autenticado. */
export function tokenValido(token?: string | null): boolean {
  try {
    if (!token) return false;
    const [expira, assinatura] = token.split(".");
    if (!expira || !assinatura) return false;
    const a = Buffer.from(assinatura);
    const b = Buffer.from(assinar(expira));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    return Number(expira) > Date.now();
  } catch {
    return false;
  }
}

/** Compara a senha em tempo constante. Sem senha configurada (ou curta demais) ninguém entra. */
export function senhaConfere(informada: string): boolean {
  const real = process.env.PORTAL_PASSWORD ?? "";
  if (real.length < 12) return false;
  const a = createHmac("sha256", "bm-portal-cmp").update(informada).digest();
  const b = createHmac("sha256", "bm-portal-cmp").update(real).digest();
  return timingSafeEqual(a, b);
}
