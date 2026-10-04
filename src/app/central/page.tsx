import Link from "next/link";
import { carregarMeuDia, nivelDoScore, type ItemCentral, type Resolvido } from "@/lib/central";
import { acaoWhatsApp } from "@/lib/whatsapp";
import { linkFinanceiro } from "@/lib/links";
import { adiar, adiarAte, ajustarPrioridade, anotar, apagarAnotacao, concluir, editarAnotacao, ignorar, reabrir, salvarNota } from "./actions";

export const dynamic = "force-dynamic";

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const NIVEL_ROTULO = { critico: "🔴 Crítico", importante: "🟠 Importante", aguardar: "🟡 Pode aguardar" } as const;
const AREAS = [
  ["pessoal", "Pessoal"],
  ["aulas", "Aulas"],
  ["shows", "Shows"],
  ["hotmart", "Hotmart"],
  ["financeiro", "Financeiro"],
  ["cavaco", "Cavaco Cifrado"],
  ["outro", "Outro"],
] as const;
const ROTULO_AREA: Record<string, string> = {
  aulas: "🎓 Aulas",
  financeiro: "💰 Financeiro",
  cavaco: "🎼 Cavaco Cifrado",
  shows: "🎤 Shows",
  hotmart: "🛒 Hotmart",
  pessoal: "👤 Pessoal",
  outro: "📌 Outros assuntos",
};
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function saudacao(hoje: string): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  const base = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const d = new Date(`${hoje}T12:00:00Z`);
  return `${base}, Bruno — ${DIAS_SEMANA[d.getUTCDay()]}, ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}`;
}

function quando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

const ddmm = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

function Ocultos({ item }: { item: { key: string; titulo: string; area: string } }) {
  return (
    <>
      <input type="hidden" name="key" value={item.key} />
      <input type="hidden" name="titulo" value={item.titulo} />
      <input type="hidden" name="area" value={item.area} />
    </>
  );
}

function Acoes({ item, ativo }: { item: ItemCentral; ativo: boolean }) {
  const wa = acaoWhatsApp(item);
  return (
    <>
      <div className="acoes">
        <form action={concluir}>
          <Ocultos item={item} />
          <button className="btn-acao principal" disabled={!ativo}>
            Concluir
          </button>
        </form>
        <form action={adiar}>
          <Ocultos item={item} />
          <input type="hidden" name="dias" value="1" />
          <button className="btn-acao" disabled={!ativo}>
            Adiar 1 dia
          </button>
        </form>
        <form action={adiar}>
          <Ocultos item={item} />
          <input type="hidden" name="dias" value="3" />
          <button className="btn-acao" disabled={!ativo}>
            Adiar 3 dias
          </button>
        </form>
        <form action={ignorar}>
          <Ocultos item={item} />
          <button className="btn-acao" disabled={!ativo}>
            Ignorar
          </button>
        </form>
        {wa && "href" in wa && (
          <a className="btn-acao whats" href={wa.href} target="_blank" rel="noopener noreferrer">
            {wa.rotulo}
          </a>
        )}
        {wa && "semNumero" in wa && <span className="item-meta">Sem WhatsApp cadastrado</span>}
        {item.href && /^https?:\/\//.test(item.href) && (
          <a className="link-origem" href={item.href} rel="noopener">
            Abrir origem →
          </a>
        )}
        {!(item.href && /^https?:\/\//.test(item.href)) && linkFinanceiro(item.key) && (
          <a className="link-origem" href={linkFinanceiro(item.key)} target="_blank" rel="noopener noreferrer">
            Abrir no financeiro →
          </a>
        )}
      </div>

      <details className="mais">
        <summary>Mais opções</summary>
        <div className="mais-corpo">
          <form action={adiarAte} className="linha-form">
            <Ocultos item={item} />
            <span className="item-meta">Adiar até:</span>
            <input name="ate" type="date" required aria-label="Adiar até a data" disabled={!ativo} />
            <button className="btn-acao" disabled={!ativo}>
              Adiar
            </button>
          </form>
          <form action={salvarNota} className="linha-form">
            <Ocultos item={item} />
            <input name="nota" defaultValue={item.nota} maxLength={500} placeholder="Observação" aria-label="Observação" disabled={!ativo} />
            <button className="btn-acao" disabled={!ativo}>
              Salvar
            </button>
          </form>

          <div className="linha-form">
            <span className="item-meta">Prioridade{item.ajuste ? ` (${item.ajuste > 0 ? "+" : ""}${item.ajuste})` : ""}:</span>
            <form action={ajustarPrioridade}>
              <Ocultos item={item} />
              <input type="hidden" name="delta" value="10" />
              <button className="btn-acao" disabled={!ativo} title="Subir prioridade">
                ▲ Subir
              </button>
            </form>
            <form action={ajustarPrioridade}>
              <Ocultos item={item} />
              <input type="hidden" name="delta" value="-10" />
              <button className="btn-acao" disabled={!ativo} title="Descer prioridade">
                ▼ Descer
              </button>
            </form>
          </div>

          {item.anotacao && (
            <>
              <form action={editarAnotacao} className="linha-form">
                <Ocultos item={item} />
                <input name="texto" defaultValue={item.titulo} maxLength={500} aria-label="Texto da anotação" disabled={!ativo} />
                <select name="area" defaultValue={item.area} aria-label="Área" disabled={!ativo}>
                  {AREAS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
                <input name="prazo" type="date" defaultValue={item.prazo} aria-label="Prazo" disabled={!ativo} />
                <button className="btn-acao" disabled={!ativo}>
                  Salvar edição
                </button>
              </form>
              <form action={apagarAnotacao}>
                <Ocultos item={item} />
                <button className="btn-acao perigo" disabled={!ativo}>
                  Apagar anotação
                </button>
              </form>
            </>
          )}
        </div>
      </details>
    </>
  );
}

function Linha({ item, pos, ativo }: { item: ItemCentral; pos?: number; ativo: boolean }) {
  const nivel = nivelDoScore(item.score);
  const mostraValor = item.valor > 0 && !item.detalhe.includes("R$") && !item.porque.includes("R$");
  return (
    <li className={`item item-${nivel}`}>
      <div className="item-topo">
        <div>
          <p className="item-titulo">
            {pos ? `${pos}. ` : ""}
            {item.titulo}
          </p>
          {item.detalhe && <p className="item-detalhe">{item.detalhe}</p>}
          <p className="item-meta">
            {NIVEL_ROTULO[nivel]} · nota {item.score}
            {item.ajuste ? ` (ajustada ${item.ajuste > 0 ? "+" : ""}${item.ajuste})` : ""}
            {item.porque && ` — ${item.porque}`}
            {mostraValor && ` · ${brl.format(item.valor)}`}
          </p>
          {item.nota && <p className="item-nota">📝 {item.nota}</p>}
        </div>
        <span className="chip-area">{item.anotacao ? "anotação" : item.area}</span>
      </div>
      <Acoes item={item} ativo={ativo} />
    </li>
  );
}

function Resolvidos({ lista, ativo }: { lista: Resolvido[]; ativo: boolean }) {
  return (
    <details className="resolvidos">
      <summary>Feitas e adiadas ({lista.length})</summary>
      <ul className="lista-itens">
        {lista.map((r) => (
          <li key={r.key} className="item">
            <div className="item-topo">
              <div>
                <p className="item-titulo">{r.titulo}</p>
                <p className="item-meta">
                  {r.status === "concluida" && "✅ Concluída hoje"}
                  {r.status === "ignorada" && "🚫 Ignorada"}
                  {r.status === "adiada" && `⏰ Adiada até ${ddmm(r.adiadaAte)}`}
                </p>
              </div>
              <form action={reabrir}>
                <Ocultos item={r} />
                <button className="btn-acao" disabled={!ativo}>
                  Reabrir
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default async function CentralPage({ searchParams }: { searchParams: Promise<{ erro?: string; area?: string }> }) {
  const { erro, area } = await searchParams;
  const dia = await carregarMeuDia();
  const criticos = dia.itens.filter((i) => nivelDoScore(i.score) === "critico").length;
  const filtroArea = (area ?? "").trim();
  const visiveis = filtroArea ? dia.itens.filter((i) => i.area === filtroArea) : dia.itens;
  const contagemPorArea = new Map<string, number>();
  for (const i of dia.itens) contagemPorArea.set(i.area, (contagemPorArea.get(i.area) ?? 0) + 1);
  const top = visiveis.slice(0, 5);
  const resto = visiveis.slice(5);
  // "Outras pendências" separadas por assunto (área); os grupos mais urgentes vêm primeiro
  const porArea = new Map<string, typeof resto>();
  for (const i of resto) {
    const lista = porArea.get(i.area) ?? [];
    lista.push(i);
    porArea.set(i.area, lista);
  }
  const gruposResto = Array.from(porArea, ([area, itens]) => ({ area, itens })).sort((a, b) => b.itens[0].score - a.itens[0].score);
  const agendaHoje = dia.agenda.filter((a) => a.data === dia.hoje);
  const agendaAmanha = dia.agenda.filter((a) => a.data !== dia.hoje);

  return (
    <div className="tela-neutra">
      <main className="pagina">
        <p className="voltar">
          <Link href="/">← Meus sistemas</Link>
        </p>
        <header className="topo">
          <h1 className="titulo">{saudacao(dia.hoje)}</h1>
          <p className="sub">O que exige atenção, o que fazer hoje e o que está esperando.</p>
        </header>

        {erro && <div className="aviso aviso-erro">Não consegui salvar essa ação. Tente de novo em instantes.</div>}
        {!dia.ok && <div className="aviso">{dia.erro}</div>}
        {dia.ok && dia.desatualizado && (
          <div className="aviso aviso-atencao">
            ⚠️ Dados do assistente desatualizados: última atualização em {quando(dia.atualizadoEm)}. Se o notebook estava desligado, abra o app Claude e use
            “Executar agora” na rotina.
          </div>
        )}

        {dia.ok && (
          <>
            {!dia.podeEscrever && (
              <div className="aviso" style={{ marginBottom: 16 }}>
                Só leitura por enquanto: falta cadastrar a chave de escrita do Make na Vercel para os botões funcionarem.
              </div>
            )}

            <div className="contadores">
              <div className="contador">
                <span>🔴 Urgentes</span>
                <strong>{criticos}</strong>
              </div>
              <div className="contador">
                <span>🟠 Pendências</span>
                <strong>{dia.itens.length}</strong>
              </div>
              <div className="contador">
                <span>⏳ Aguardando</span>
                <strong>{dia.aguardando.length}</strong>
              </div>
              <div className="contador">
                <span>✅ Feitas hoje</span>
                <strong>{dia.concluidosHoje}</strong>
              </div>
            </div>

            <form action={anotar} className="captura">
              <input name="texto" required maxLength={500} placeholder="Anotar: “me lembra de…”, “preciso cobrar…”" disabled={!dia.podeEscrever} />
              <select name="area" defaultValue="pessoal" aria-label="Área" disabled={!dia.podeEscrever}>
                {AREAS.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
              <input name="prazo" type="date" aria-label="Prazo (opcional)" disabled={!dia.podeEscrever} />
              <button className="btn-entrar" style={{ width: "auto", marginTop: 0 }} disabled={!dia.podeEscrever}>
                Anotar
              </button>
            </form>

            {dia.agenda.length > 0 && (
              <section>
                <h2 className="subtitulo">📅 Agenda</h2>
                <div className="agenda">
                  {agendaHoje.length > 0 && (
                    <div>
                      <p className="agenda-dia">Hoje</p>
                      <ul className="agenda-lista">
                        {agendaHoje.map((a) => (
                          <li key={a.key}>
                            <span className="hora">{a.hora}</span>
                            <span>
                              {a.titulo}
                              {a.detalhe && <em> — {a.detalhe}</em>}
                              {a.pedidos.length > 0 && (
                                <span className="pedidos">
                                  {" "}
                                  📝 <Link href={`/aulas?aluno=${encodeURIComponent(a.titulo.split(" ")[0])}`}>{a.pedidos.join(" · ")}</Link>
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {agendaAmanha.length > 0 && (
                    <div>
                      <p className="agenda-dia">Amanhã</p>
                      <ul className="agenda-lista">
                        {agendaAmanha.map((a) => (
                          <li key={a.key}>
                            <span className="hora">{a.hora}</span>
                            <span>
                              {a.titulo}
                              {a.detalhe && <em> — {a.detalhe}</em>}
                              {a.pedidos.length > 0 && (
                                <span className="pedidos">
                                  {" "}
                                  📝 <Link href={`/aulas?aluno=${encodeURIComponent(a.titulo.split(" ")[0])}`}>{a.pedidos.join(" · ")}</Link>
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {dia.plano.length > 0 && (
              <details className="resolvidos" open>
                <summary>🗓️ Ordem sugerida para hoje</summary>
                <ol className="plano">
                  {dia.plano.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ol>
              </details>
            )}

            {contagemPorArea.size > 1 && (
              <nav className="filtros" aria-label="Filtrar por assunto">
                <Link href="/central" className={`filtro ${filtroArea ? "" : "ativo"}`}>
                  Todos ({dia.itens.length})
                </Link>
                {Array.from(contagemPorArea, ([a, n]) => (
                  <Link key={a} href={`/central?area=${encodeURIComponent(a)}`} className={`filtro ${filtroArea === a ? "ativo" : ""}`}>
                    {ROTULO_AREA[a] ?? ROTULO_AREA.outro} ({n})
                  </Link>
                ))}
              </nav>
            )}

            <details className="resolvidos" open>
              <summary>🎯 Top 5 do dia ({top.length})</summary>
              {top.length === 0 ? (
                <div className="aviso">Nada exigindo atenção agora. 🎉</div>
              ) : (
                <ul className="lista-itens">
                  {top.map((i, n) => (
                    <Linha key={i.key} item={i} pos={n + 1} ativo={dia.podeEscrever} />
                  ))}
                </ul>
              )}
            </details>

            {dia.aguardando.length > 0 && (
              <section>
                <h2 className="subtitulo">⏳ Aguardando terceiros</h2>
                <ul className="lista-itens">
                  {dia.aguardando.map((i) => (
                    <li key={i.key} className="item">
                      <p className="item-titulo">
                        {i.quem ? `${i.quem} — ` : ""}
                        {i.titulo}
                      </p>
                      {i.detalhe && <p className="item-detalhe">{i.detalhe}</p>}
                      <p className="item-meta">
                        {i.ultimoContato && `último contato ${ddmm(i.ultimoContato)}`}
                        {i.lembrarEm && ` · lembrar em ${ddmm(i.lembrarEm)}`}
                      </p>
                      {i.nota && <p className="item-nota">📝 {i.nota}</p>}
                      <Acoes item={i} ativo={dia.podeEscrever} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {resto.length > 0 && (
              <details className="resolvidos">
                <summary>Outras pendências ({resto.length})</summary>
                {gruposResto.map((g) => (
                  <details key={g.area} className="resolvidos grupo">
                    <summary>
                      {ROTULO_AREA[g.area] ?? ROTULO_AREA.outro} ({g.itens.length})
                    </summary>
                    <ul className="lista-itens">
                      {g.itens.map((i) => (
                        <Linha key={i.key} item={i} ativo={dia.podeEscrever} />
                      ))}
                    </ul>
                  </details>
                ))}
              </details>
            )}

            {dia.resumos.map((r) => (
              <details key={r.key} className="resolvidos">
                <summary>{r.titulo}</summary>
                <div className="caixa-texto">{r.detalhe}</div>
              </details>
            ))}

            {dia.tudoCerto.length > 0 && (
              <details className="resolvidos">
                <summary>✅ Está tudo certo ({dia.tudoCerto.length})</summary>
                <ul className="tudo-certo">
                  {dia.tudoCerto.map((t) => (
                    <li key={t}>✓ {t}</li>
                  ))}
                </ul>
              </details>
            )}

            {dia.resolvidos.length > 0 && <Resolvidos lista={dia.resolvidos} ativo={dia.podeEscrever} />}

            <p className="rodape" style={{ marginTop: 28 }}>
              {dia.atualizadoEm ? `Dados do assistente atualizados em ${quando(dia.atualizadoEm)}.` : "Aguardando a primeira atualização do assistente."}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
