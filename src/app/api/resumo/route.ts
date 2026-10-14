import { timingSafeEqual } from "node:crypto";
import { carregarMeuDia, nivelDoScore, type ItemCentral } from "@/lib/central";

export const dynamic = "force-dynamic";

/**
 * Resumo do Meu Dia já filtrado (nada concluído/ignorado/adiado entra), para o Make e para o assistente usarem.
 * Protegido por RESUMO_TOKEN (cabeçalho x-resumo-token). Sem a variável configurada, recusa tudo.
 */
function autorizado(req: Request): boolean {
  const esperado = process.env.RESUMO_TOKEN ?? "";
  const recebido = req.headers.get("x-resumo-token") ?? "";
  if (esperado.length < 20 || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function linha(i: ItemCentral): string {
  const extra = [i.valor > 0 ? brl.format(i.valor) : "", i.prazo ? `prazo ${i.prazo.slice(8, 10)}/${i.prazo.slice(5, 7)}` : ""].filter(Boolean).join(" · ");
  return `• ${i.titulo}${extra ? ` (${extra})` : ""}${i.porque ? ` — ${i.porque}` : ""}`;
}

export async function GET(req: Request) {
  if (!autorizado(req)) return new Response("não autorizado", { status: 401 });
  const dia = await carregarMeuDia();
  if (!dia.ok) return Response.json({ ok: false, erro: dia.erro ?? "erro" }, { status: 503 });

  const criticos = dia.itens.filter((i) => nivelDoScore(i.score) === "critico");
  const importantes = dia.itens.filter((i) => nivelDoScore(i.score) === "importante").slice(0, 6);
  const [ano, mes, d] = dia.hoje.split("-");
  const agendaHoje = dia.agenda.filter((a) => a.data === dia.hoje);

  const blocos: string[] = [`☀️ Meu Dia — ${d}/${mes}/${ano}`];
  blocos.push(criticos.length ? `🔴 URGENTE (${criticos.length})\n${criticos.map(linha).join("\n")}` : "🔴 Nada urgente agora.");
  if (importantes.length) blocos.push(`🟠 IMPORTANTE\n${importantes.map(linha).join("\n")}`);
  if (dia.aguardando.length) blocos.push(`⏳ AGUARDANDO\n${dia.aguardando.slice(0, 5).map((i) => `• ${i.titulo}${i.quem ? ` (${i.quem})` : ""}`).join("\n")}`);
  if (agendaHoje.length) blocos.push(`📅 AGENDA DE HOJE\n${agendaHoje.map((a) => `• ${a.hora} ${a.titulo}${a.pedidos.length ? ` — preparar: ${a.pedidos.join("; ")}` : ""}`).join("\n")}`);
  for (const r of dia.resumos) if (r.detalhe) blocos.push(`${r.titulo}\n${r.detalhe}`);
  if (dia.desatualizado) blocos.push("⚠️ O assistente não atualiza o Meu Dia há mais de 20 horas; alguns dados podem estar velhos.");

  const texto = blocos.join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</div>`;

  return Response.json({
    ok: true,
    hoje: dia.hoje,
    urgentes: criticos.length,
    importantes: importantes.length,
    assunto: criticos.length ? `🔴 Meu Dia ${d}/${mes} — ${criticos.length} urgente(s)` : `☀️ Meu Dia ${d}/${mes}`,
    texto,
    html,
  });
}
