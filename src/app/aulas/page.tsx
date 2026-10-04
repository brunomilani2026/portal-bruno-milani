import Link from "next/link";
import {
  TIPOS,
  buscas,
  carregarAulas,
  chaveAluno,
  diasAte,
  diasDesde,
  idYoutube,
  linkSeguro,
  nomeDoLink,
  rotuloAula,
  rotuloTipo,
  textoPrazo,
  tipoValido,
  type Anotacao,
} from "@/lib/aulas";
import { apagarAnotacao, criarAnotacao, editarAnotacao, mudarStatus } from "./actions";

export const dynamic = "force-dynamic";

const DIAS_ANTIGO = 14;

function dataBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const ORDENS = [
  { valor: "entrega", rotulo: "📅 Ordem de entrega", ajuda: "alunos pela aula mais próxima" },
  { valor: "alfabetica", rotulo: "🔤 Alunos A–Z", ajuda: "alunos em ordem alfabética" },
  { valor: "recentes", rotulo: "🆕 Anotados por último", ajuda: "do pedido mais novo para o mais antigo" },
  { valor: "antigas", rotulo: "⏳ Mais antigos primeiro", ajuda: "quem espera há mais tempo" },
  { valor: "prioridade", rotulo: "⭐ Prioridade", ajuda: "prioridade alta primeiro" },
  { valor: "musica", rotulo: "🎵 Música A–Z", ajuda: "pelo nome da música/assunto" },
  { valor: "tipo", rotulo: "🗂️ Por tipo", ajuda: "música, técnica, teoria, apresentação" },
] as const;

type Ordem = (typeof ORDENS)[number]["valor"];
const AGRUPADAS: Ordem[] = ["entrega", "alfabetica"];

function ordenar(lista: Anotacao[], ordem: Ordem): Anotacao[] {
  const pt = (x: string, y: string) => x.localeCompare(y, "pt-BR");
  const antigaPrimeiro = (a: Anotacao, b: Anotacao) => (a.criadoEm < b.criadoEm ? -1 : a.criadoEm > b.criadoEm ? 1 : 0);
  const copia = [...lista];
  switch (ordem) {
    case "alfabetica":
      return copia.sort((a, b) => pt(a.assunto, b.assunto));
    case "recentes":
      return copia.sort((a, b) => -antigaPrimeiro(a, b));
    case "antigas":
      return copia.sort(antigaPrimeiro);
    case "prioridade":
      return copia.sort((a, b) => (a.prioridade === b.prioridade ? antigaPrimeiro(a, b) : a.prioridade === "alta" ? -1 : 1));
    case "musica":
      return copia.sort((a, b) => pt(a.assunto, b.assunto));
    case "tipo":
      return copia.sort((a, b) => TIPOS.findIndex((t) => t.valor === a.tipo) - TIPOS.findIndex((t) => t.valor === b.tipo) || pt(a.aluno, b.aluno) || antigaPrimeiro(a, b));
    default:
      return copia.sort((a, b) => (a.prioridade === b.prioridade ? antigaPrimeiro(a, b) : a.prioridade === "alta" ? -1 : 1));
  }
}

function href(p: { aluno?: string; tipo?: string; q?: string; ordem?: string }): string {
  const q = new URLSearchParams();
  if (p.ordem && p.ordem !== "entrega") q.set("ordem", p.ordem);
  if (p.aluno) q.set("aluno", p.aluno);
  if (p.tipo) q.set("tipo", p.tipo);
  if (p.q) q.set("q", p.q);
  const s = q.toString();
  return s ? `/aulas?${s}` : "/aulas";
}

function Campos({ a, ativo }: { a?: Anotacao; ativo: boolean }) {
  return (
    <>
      <div className="form-linha">
        <select name="tipo" defaultValue={a?.tipo ?? "musica"} aria-label="Tipo" disabled={!ativo}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </select>
        <input name="tom" defaultValue={a?.tom ?? ""} maxLength={60} placeholder="Tom ou andamento (ex.: Dó maior, 90 bpm)" aria-label="Tom ou andamento" disabled={!ativo} />
        <select name="prioridade" defaultValue={a?.prioridade ?? "normal"} aria-label="Prioridade" disabled={!ativo}>
          <option value="normal">Prioridade normal</option>
          <option value="alta">⭐ Prioridade alta</option>
        </select>
      </div>
      <textarea name="observacoes" defaultValue={a?.observacoes ?? ""} maxLength={1000} rows={3} placeholder="Observações (versão, nível, o que o aluno quer aprender…)" aria-label="Observações" disabled={!ativo} />
      <input name="link" defaultValue={a?.link ?? ""} maxLength={500} placeholder="Link (vídeo, cifra, partitura…) — opcional" aria-label="Link" disabled={!ativo} />
    </>
  );
}

function Cartao({ a, ativo, voltar }: { a: Anotacao; ativo: boolean; voltar: string }) {
  const link = linkSeguro(a.link);
  const yt = link ? idYoutube(link) : "";
  const feito = a.status === "feito";
  const dias = diasDesde(a.criadoEm);
  const antigo = !feito && dias > DIAS_ANTIGO;
  return (
    <li className={`item ${feito ? "item-feito" : ""} ${antigo ? "item-antigo" : ""}`}>
      <div className="item-topo">
        <div>
          <p className="item-titulo">
            {a.prioridade === "alta" && !feito && <span title="Prioridade alta">⭐ </span>}
            {a.assunto}
          </p>
          <p className="selos">
            <span className="selo">{rotuloTipo(a.tipo)}</span>
            {a.tom && <span className="selo">🎹 {a.tom}</span>}
            {!feito && (
              <span className={`selo ${antigo ? "selo-alerta" : ""}`}>
                {dias === 0 ? "pedido hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
                {antigo ? " ⚠" : ""}
              </span>
            )}
            {feito && a.feitoEm && <span className="selo">✔ feito em {dataBR(a.feitoEm)}</span>}
          </p>
          {a.observacoes && <p className="item-detalhe obs">{a.observacoes}</p>}
          {a.posAula && (
            <p className="item-detalhe obs pos-aula">
              <strong>Pós-aula:</strong> {a.posAula}
            </p>
          )}
          {link && (
            <p className="item-meta">
              {yt ? (
                <a className="miniatura" href={link} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="Miniatura do vídeo" width={160} height={90} loading="lazy" />
                  <span>▶ Abrir vídeo ↗</span>
                </a>
              ) : (
                <>
                  🔗{" "}
                  <a className="link-origem" href={link} target="_blank" rel="noopener noreferrer">
                    {nomeDoLink(link)} ↗
                  </a>
                </>
              )}
            </p>
          )}
          {a.tipo === "musica" && (
            <p className="buscas">
              {buscas(a.assunto).map((b) => (
                <a key={b.rotulo} className="busca" href={b.href} target="_blank" rel="noopener noreferrer">
                  {b.rotulo}
                </a>
              ))}
            </p>
          )}
          <p className="item-meta">anotado em {dataBR(a.criadoEm)}</p>
        </div>
        <span className="chip-area">{a.aluno}</span>
      </div>

      <div className="acoes">
        <form action={mudarStatus}>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="voltar" value={voltar} />
          <input type="hidden" name="status" value={feito ? "pendente" : "feito"} />
          <button className={`btn-acao ${feito ? "" : "principal"}`} disabled={!ativo}>
            {feito ? "Reabrir" : "Marcar como feito"}
          </button>
        </form>
      </div>

      <details className="mais">
        <summary>{feito ? "Pós-aula, editar ou apagar" : "Editar, pós-aula ou apagar"}</summary>
        <div className="mais-corpo">
          <form action={editarAnotacao} className="form-aula">
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <input name="aluno" defaultValue={a.aluno} required maxLength={80} aria-label="Aluno" disabled={!ativo} />
            <input name="assunto" defaultValue={a.assunto} required maxLength={200} aria-label="Assunto" disabled={!ativo} />
            <Campos a={a} ativo={ativo} />
            <textarea name="pos_aula" defaultValue={a.posAula} maxLength={1000} rows={2} placeholder="Pós-aula: como foi e tarefa de casa (memória para a próxima aula)" aria-label="Pós-aula" disabled={!ativo} />
            <button className="btn-acao" disabled={!ativo}>
              Salvar alterações
            </button>
          </form>
          <form action={apagarAnotacao}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <button className="btn-acao perigo" disabled={!ativo}>
              Apagar anotação
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}

function agrupar(lista: Anotacao[], proximas: Record<string, string> = {}): [string, Anotacao[]][] {
  const mapa = new Map<string, Anotacao[]>();
  for (const a of lista) {
    const k = chaveAluno(a.aluno) || a.aluno;
    mapa.set(k, [...(mapa.get(k) ?? []), a]);
  }
  return Array.from(mapa.values())
    .map((itens): [string, Anotacao[]] => [itens[0].aluno, itens])
    .sort((x, y) => {
      const ax = proximas[chaveAluno(x[0])] ?? "";
      const ay = proximas[chaveAluno(y[0])] ?? "";
      if (ax && ay) return ax < ay ? -1 : ax > ay ? 1 : 0;
      if (ax) return -1;
      if (ay) return 1;
      return x[0].localeCompare(y[0], "pt-BR");
    });
}

export default async function AulasPage({ searchParams }: { searchParams: Promise<{ aluno?: string; tipo?: string; q?: string; ordem?: string; erro?: string }> }) {
  const { aluno: alunoBruto, tipo: tipoBruto, q: qBruto, ordem: ordemBruta, erro } = await searchParams;
  const ordem: Ordem = ORDENS.find((o) => o.valor === ordemBruta)?.valor ?? "entrega";
  const filtro = (alunoBruto ?? "").trim().slice(0, 80);
  const tipoFiltro = TIPOS.some((t) => t.valor === tipoBruto) ? tipoValido(tipoBruto ?? "") : "";
  const busca = (qBruto ?? "").trim().slice(0, 80);
  const dados = await carregarAulas();
  const voltar = new URLSearchParams({ ...(filtro && { aluno: filtro }), ...(tipoFiltro && { tipo: tipoFiltro }), ...(busca && { q: busca }), ...(ordem !== "entrega" && { ordem }) }).toString();

  const todasPendentes = dados.anotacoes.filter((a) => a.status === "pendente");
  const comAnotacao = Array.from(new Set(dados.anotacoes.map((a) => a.aluno).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const qn = semAcento(busca);

  const visiveis = dados.anotacoes.filter(
    (a) =>
      (!filtro || chaveAluno(a.aluno) === chaveAluno(filtro)) &&
      (!tipoFiltro || a.tipo === tipoFiltro) &&
      (!qn || semAcento(`${a.aluno} ${a.assunto} ${a.observacoes} ${a.tom} ${a.posAula}`).includes(qn)),
  );
  const pendentes = ordenar(visiveis.filter((a) => a.status === "pendente"), ordem === "entrega" ? "entrega" : ordem);
  const feitas = visiveis.filter((a) => a.status === "feito").sort((a, b) => ((a.feitoEm || a.atualizadoEm) < (b.feitoEm || b.atualizadoEm) ? 1 : -1));

  const preparar = agrupar(todasPendentes, dados.proximas)
    .map(([nome, itens]): [string, Anotacao[], string] => [nome, itens, dados.proximas[chaveAluno(nome)] ?? ""])
    .filter(([, , iso]) => iso && diasAte(iso) >= 0 && diasAte(iso) <= 7);

  const antigas = todasPendentes.filter((a) => diasDesde(a.criadoEm) > DIAS_ANTIGO).length;
  const altas = todasPendentes.filter((a) => a.prioridade === "alta").length;
  const alunosComPedido = new Set(todasPendentes.map((a) => chaveAluno(a.aluno))).size;

  return (
    <div className="tela-neutra">
      <main className="pagina">
        <p className="voltar">
          <Link href="/">← Meus sistemas</Link>
        </p>
        <header className="topo">
          <h1 className="titulo">📝 Anotações de aulas</h1>
          <p className="sub">Músicas e assuntos pedidos pelos alunos para a próxima aula.</p>
        </header>

        {erro === "formato" && <div className="aviso aviso-erro">Use o formato “Aluno – assunto”, por exemplo: Iuri – Amor de Verão.</div>}
        {erro && erro !== "formato" && <div className="aviso aviso-erro">Não consegui salvar essa ação. Tente de novo em instantes.</div>}
        {!dados.ok && <div className="aviso">{dados.erro}</div>}

        {dados.ok && (
          <>
            {!dados.podeEscrever && (
              <div className="aviso" style={{ marginBottom: 16 }}>
                Só leitura por enquanto: falta cadastrar a chave de escrita do Make na Vercel.
              </div>
            )}

            <div className="resumo-aulas" aria-label="Resumo">
              <div className="num">
                <strong>{todasPendentes.length}</strong>
                <span>pedidos pendentes</span>
              </div>
              <div className="num">
                <strong>{alunosComPedido}</strong>
                <span>alunos esperando</span>
              </div>
              <div className={`num ${altas ? "num-destaque" : ""}`}>
                <strong>{altas}</strong>
                <span>prioridade alta</span>
              </div>
              <div className={`num ${antigas ? "num-alerta" : ""}`}>
                <strong>{antigas}</strong>
                <span>parados há +{DIAS_ANTIGO} dias</span>
              </div>
            </div>

            {preparar.length > 0 && (
              <section className="preparar" aria-label="Preparar para as próximas aulas">
                <h2 className="subtitulo">🎯 Deixar pronto para as próximas aulas</h2>
                <ul>
                  {preparar.map(([nome, itens, iso]) => (
                    <li key={nome}>
                      <Link href={href({ aluno: nome , ordem })}>
                        <strong>{nome}</strong>
                      </Link>{" "}
                      — {rotuloAula(iso)} <span className="prazo-aula">({textoPrazo(diasAte(iso))})</span>: {itens.map((i) => i.assunto).join(" · ")}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <form action={criarAnotacao} className="form-aula caixa-form">
              <input type="hidden" name="voltar" value={voltar} />
              <input
                name="rapido"
                maxLength={300}
                placeholder={`Anotação rápida: ${filtro || "Iuri"} – Amor de Verão`}
                aria-label="Anotação rápida: aluno – assunto"
                autoComplete="off"
                disabled={!dados.podeEscrever}
                list="alunos"
                required
              />
              <datalist id="alunos">
                {dados.alunos.map((n) => (
                  <option key={n} value={`${n} – `} />
                ))}
              </datalist>
              <details className="mais mais-form">
                <summary>Mais detalhes (tipo, tom, prioridade, observações, link)</summary>
                <div className="mais-corpo">
                  <Campos ativo={dados.podeEscrever} />
                </div>
              </details>
              <button className="btn-entrar" style={{ width: "auto", marginTop: 0, alignSelf: "flex-start" }} disabled={!dados.podeEscrever}>
                Salvar anotação
              </button>
            </form>

            <form action="/aulas" method="get" className="busca-form" role="search">
              {filtro && <input type="hidden" name="aluno" value={filtro} />}
              {tipoFiltro && <input type="hidden" name="tipo" value={tipoFiltro} />}
              {ordem !== "entrega" && <input type="hidden" name="ordem" value={ordem} />}
              <input name="q" defaultValue={busca} placeholder="🔎 Buscar por música, aluno, observação…" aria-label="Buscar" />
              <button className="btn-acao">Buscar</button>
              {busca && (
                <Link className="btn-acao" href={href({ aluno: filtro, tipo: tipoFiltro , ordem })}>
                  Limpar
                </Link>
              )}
            </form>

            {comAnotacao.length > 0 && (
              <nav className="filtros" aria-label="Filtrar por aluno">
                <Link href={href({ tipo: tipoFiltro, q: busca , ordem })} className={`filtro ${filtro ? "" : "ativo"}`}>
                  Todos
                </Link>
                {comAnotacao.map((n) => {
                  const qtd = todasPendentes.filter((a) => chaveAluno(a.aluno) === chaveAluno(n)).length;
                  return (
                    <Link
                      key={n}
                      href={href({ aluno: n, tipo: tipoFiltro, q: busca , ordem })}
                      className={`filtro ${chaveAluno(n) === chaveAluno(filtro) && filtro ? "ativo" : ""}`}
                    >
                      {n}
                      {qtd > 0 && <span className="contagem">{qtd}</span>}
                    </Link>
                  );
                })}
              </nav>
            )}

            <nav className="filtros" aria-label="Filtrar por tipo">
              <Link href={href({ aluno: filtro, q: busca , ordem })} className={`filtro ${tipoFiltro ? "" : "ativo"}`}>
                Todos os tipos
              </Link>
              {TIPOS.map((t) => (
                <Link key={t.valor} href={href({ aluno: filtro, tipo: t.valor, q: busca , ordem })} className={`filtro ${tipoFiltro === t.valor ? "ativo" : ""}`}>
                  {t.rotulo}
                </Link>
              ))}
            </nav>

            <nav className="filtros ordens" aria-label="Ordenar">
              <span className="rotulo-ordem">Ordenar por:</span>
              {ORDENS.map((o) => (
                <Link key={o.valor} href={href({ aluno: filtro, tipo: tipoFiltro, q: busca, ordem: o.valor })} title={o.ajuda} className={`filtro ${ordem === o.valor ? "ativo" : ""}`}>
                  {o.rotulo}
                </Link>
              ))}
            </nav>

            <section>
              <h2 className="subtitulo">Para a próxima aula ({pendentes.length})</h2>
              {pendentes.length === 0 ? (
                <div className="vazio">
                  <p>🎶 Nenhum pedido pendente{filtro ? ` para ${filtro}` : ""}{busca || tipoFiltro ? " com esses filtros" : ""}.</p>
                  <p className="item-meta">Use a anotação rápida acima: “Aluno – música”.</p>
                </div>
              ) : (
                !AGRUPADAS.includes(ordem) ? (
                  <ul className="lista-itens">
                    {pendentes.map((a) => (
                      <Cartao key={a.id} a={a} ativo={dados.podeEscrever} voltar={voltar} />
                    ))}
                  </ul>
                ) : (
                agrupar(pendentes, ordem === "entrega" ? dados.proximas : {}).map(([nome, itens]) => {
                  const iso = dados.proximas[chaveAluno(nome)];
                  return (
                  <details key={nome} className="resolvidos grupo" open>
                    <summary>
                      {nome} ({itens.length})
                      {iso && (
                        <span className={`proxima ${diasAte(iso) <= 2 ? "proxima-perto" : ""}`}>
                          📅 próxima aula {rotuloAula(iso)} · {textoPrazo(diasAte(iso))}
                        </span>
                      )}
                    </summary>
                    <ul className="lista-itens">
                      {itens.map((a) => (
                        <Cartao key={a.id} a={a} ativo={dados.podeEscrever} voltar={voltar} />
                      ))}
                    </ul>
                  </details>
                  );
                })
                )
              )}
            </section>

            {feitas.length > 0 && (
              <details className="resolvidos">
                <summary>Histórico de aulas — já feitas ({feitas.length})</summary>
                {agrupar(feitas).map(([nome, itens]) => (
                  <details key={nome} className="resolvidos grupo">
                    <summary>
                      {nome} ({itens.length})
                    </summary>
                    <ul className="lista-itens">
                      {itens.map((a) => (
                        <Cartao key={a.id} a={a} ativo={dados.podeEscrever} voltar={voltar} />
                      ))}
                    </ul>
                  </details>
                ))}
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
