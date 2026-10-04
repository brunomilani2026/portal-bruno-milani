const FIN = (process.env.URL_FINANCAS || "https://financas-pessoais-bruno-milani.vercel.app").replace(/\/+$/, "");

/** Atalho para a tela certa do app financeiro, conforme o tipo do item. */
export function linkFinanceiro(key: string): string {
  if (key.startsWith("aluno-atraso:")) return `${FIN}/alunos/dashboard`;
  if (key.startsWith("despesa:")) return `${FIN}/despesas/todas`;
  if (key.startsWith("saldo-baixo:")) return `${FIN}/contas`;
  if (key.startsWith("show-atrasado:")) return `${FIN}/shows/dashboard`;
  if (key.startsWith("hotmart:")) return `${FIN}/hotmart/dashboard`;
  return "";
}