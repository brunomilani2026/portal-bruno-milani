/**
 * Cliente mínimo da API do Make para data stores.
 * - Leitura usa MAKE_API_TOKEN (se faltar, tenta MAKE_API_TOKEN_WRITE).
 * - Escrita usa MAKE_API_TOKEN_WRITE.
 * Os tokens ficam só no servidor (variáveis da Vercel); nunca vão para o navegador.
 */

const ZONA = process.env.MAKE_ZONE || "us2.make.com";

export const STORES = {
  briefing: process.env.MAKE_DATASTORE_BRIEFING || "164483",
  tarefas: process.env.MAKE_DS_TAREFAS || "164497",
  status: process.env.MAKE_DS_STATUS || "164498",
  capturas: process.env.MAKE_DS_CAPTURAS || "164499",
};

export type RegistroMake = { key: string; data: Record<string, unknown> };

export class MakeErro extends Error {
  constructor(
    mensagem: string,
    public readonly tipo: "sem-token" | "http" | "rede",
  ) {
    super(mensagem);
  }
}

export function temTokenLeitura(): boolean {
  return Boolean(process.env.MAKE_API_TOKEN || process.env.MAKE_API_TOKEN_WRITE);
}

export function temTokenEscrita(): boolean {
  return Boolean(process.env.MAKE_API_TOKEN_WRITE);
}

async function chamar(path: string, token: string | undefined, init: RequestInit = {}): Promise<Response> {
  if (!token) throw new MakeErro("Token do Make ausente.", "sem-token");
  try {
    const res = await fetch(`https://${ZONA}/api/v2${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new MakeErro(`Make respondeu ${res.status}`, "http");
    return res;
  } catch (e) {
    if (e instanceof MakeErro) throw e;
    throw new MakeErro(e instanceof Error ? e.message : "falha de rede", "rede");
  }
}

export async function listarRegistros(storeId: string): Promise<RegistroMake[]> {
  const token = process.env.MAKE_API_TOKEN || process.env.MAKE_API_TOKEN_WRITE;
  const res = await chamar(`/data-stores/${storeId}/data?pg%5Blimit%5D=1000`, token);
  const json = (await res.json()) as { records?: RegistroMake[] } | RegistroMake[];
  const lista = Array.isArray(json) ? json : (json.records ?? []);
  return lista.filter((r) => r && typeof r.key === "string");
}

/** Cria ou substitui o registro (PUT). */
export async function gravarRegistro(storeId: string, key: string, data: Record<string, unknown>): Promise<void> {
  await chamar(`/data-stores/${storeId}/data/${encodeURIComponent(key)}`, process.env.MAKE_API_TOKEN_WRITE, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

export async function criarRegistro(storeId: string, key: string, data: Record<string, unknown>): Promise<void> {
  await chamar(`/data-stores/${storeId}/data`, process.env.MAKE_API_TOKEN_WRITE, {
    method: "POST",
    body: JSON.stringify({ key, data }),
  });
}
