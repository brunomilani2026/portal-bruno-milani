import type { ItemCentral } from "./central";

const brl2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Deixa só dígitos e garante o DDI 55. Retorna "" se não parecer um telefone. */
function normalizarTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return "";
}

function telefoneDoItem(item: ItemCentral): string {
  const direto = normalizarTelefone(item.whatsapp);
  if (direto) return direto;
  if (item.key.startsWith("lead:")) {
    const t = normalizarTelefone(item.key.slice(5));
    if (t) return t;
  }
  const achado = item.detalhe.match(/\+?\d{2}\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  return achado ? normalizarTelefone(achado[0]) : "";
}

function dataBR(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso;
}

/** Mensagem de cobrança (modelo do Bruno), no formato do WhatsApp (*negrito*). */
function mensagemCobranca(nome: string, vencimentoISO: string, valor: number): string {
  return [
    `Olá, ${nome}! 👋`,
    "",
    `Identificamos que a sua mensalidade com vencimento em *${dataBR(vencimentoISO)}*, no valor de *R$ ${brl2.format(valor)}*, ainda consta como pendente em nosso sistema.`,
    "",
    "Para manter seus pagamentos e suas aulas em dia, pedimos que realize a regularização assim que possível.",
    "",
    "Caso precise de alguma informação sobre o pagamento, estamos à disposição para ajudar.",
    "",
    "🤖 *Mensagem automática — Agenda Pro Music*",
    "",
    "Se o pagamento já tiver sido realizado, por favor, desconsidere esta mensagem. A confirmação pode levar algum tempo para ser atualizada em nosso sistema.",
  ].join("\n");
}

export type AcaoWhatsApp = { href: string; rotulo: string } | { semNumero: true } | null;

export function acaoWhatsApp(item: ItemCentral): AcaoWhatsApp {
  const ehCobranca = item.key.startsWith("aluno-atraso:");
  const ehLead = item.key.startsWith("lead:");
  if (!ehCobranca && !ehLead) return null;

  const tel = telefoneDoItem(item);
  if (!tel) return { semNumero: true };

  if (ehCobranca) {
    const [, nome = "", venc = item.prazo] = item.key.split(":");
    const texto = mensagemCobranca(nome.split(" ")[0] || nome, venc, item.valor);
    return { href: `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, rotulo: "Cobrar no WhatsApp" };
  }
  return { href: `https://wa.me/${tel}`, rotulo: "Abrir WhatsApp" };
}
