import Link from "next/link";
import { carregarAulas, chaveAluno, linkSeguro, nomeDoLink, type Anotacao } from "@/lib/aulas";
import { apagarAnotacao, criarAnotacao, editarAnotacao, mudarStatus } from "./actions";

export const dynamic = "force-dynamic";

function dataBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}

function Cartao({ a, ativo, filtro }: { a: Anotacao; ativo: boolean; filtro: string }) {
  const link = linkSeguro(a.link);
  const feito = a.status === "feito";
  return (
    <li className={`item ${feito ? "item-feito" : ""}`}>
      <div className="item-topo">
        <div>
          <p className="item-titulo">{a.assunto}</p>
          {a.observacoes && <p className="item-detalhe obs">{a.observacoes}</p>}
          {link && (
            <p className="item-meta">
              🔗{" "}
              <a className="link-origem" href={link} target="_blank" rel="noopener noreferrer">
                {nomeDoLink(link)} ↗
              </a>
            </p>
          )}
          <p className="item-meta">anotado em {dataBR(a.criadoEm)}</p>
        </div>
        <span className="chip-area">{a.aluno}</span>
      </div>

      <div className="acoes">
        <form action={mudarStatus}>
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="filtro" value={filtro} />
          <input type="hidden" name="status" value={feito ? "pendente" : "feito"} />
          <button className={`btn-acao ${feito ? "" : "principal"}`} disabled={!ativo}>
            {feito ? "Reabrir" : "Marcar como feito"}
          </button>
        </form>
      </div>

      <details className="mais">
        <summary>Editar ou apagar</summary>
        <div className="mais-corpo">
          <form action={editarAnotacao} className="form-aula">
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="filtro" value={filtro} />
            <input name="aluno" defaultValue={a.aluno} required maxLength={80} aria-label="Aluno" disabled={!ativo} />
            <input name="assunto" defaultValue={a.assunto} required maxLength={200} aria-label="Assunto" disabled={!ativo} />
            <textarea name="observacoes" defaultValue={a.observacoes} maxLength={1000} rows={3} aria-label="Observações" disabled={!ativo} />
            <input name="link" defaultValue={a.link} maxLength={500} placeholder="Link (opcional)" aria-label="Link" disabled={!ativo} />
            <button className="btn-acao" disabled={!ativo}>
              Salvar edição
            </button>
          </form>
          <form action={apagarAnotacao}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="filtro" value={filtro} />
            <button className="btn-acao perigo" disabled={!ativo}>
              Apagar anotação
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}

export default async function AulasPage({ searchParams }: { searchParams: Promise<{ aluno?: string; erro?: string }> }) {
  const { aluno: filtroBruto, erro } = await searchParams;
  const filtro = (filtroBruto ?? "").trim();
  const dados = await carregarAulas();

  const comAnotacao = Array.from(new Set(dados.anotacoes.map((a) => a.aluno).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const visiveis = filtro ? dados.anotacoes.filter((a) => chaveAluno(a.aluno) === chaveAluno(filtro)) : dados.anotacoes;
  const pendentes = visiveis.filter((a) => a.status === "pendente");
  const feitas = visiveis.filter((a) => a.status === "feito");

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

        {erro && <div className="aviso aviso-erro">Não consegui salvar essa ação. Tente de novo em instantes.</div>}
        {!dados.ok && <div className="aviso">{dados.erro}</div>}

        {dados.ok && (
          <>
            {!dados.podeEscrever && (
              <div className="aviso" style={{ marginBottom: 16 }}>
                Só leitura por enquanto: falta cadastrar a chave de escrita do Make na Vercel.
              </div>
            )}

            <form action={criarAnotacao} className="form-aula caixa-form">
              <input type="hidden" name="filtro" value={filtro} />
              <div className="form-linha">
                <input name="aluno" list="alunos" required maxLength={80} placeholder="Nome do aluno" defaultValue={filtro} aria-label="Nome do aluno" disabled={!dados.podeEscrever} />
                <datalist id="alunos">
                  {dados.alunos.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
                <input name="assunto" required maxLength={200} placeholder="Assunto ou música pedida" aria-label="Assunto" disabled={!dados.podeEscrever} />
              </div>
              <textarea name="observacoes" maxLength={1000} rows={3} placeholder="Observações (tom, versão, nível, o que o aluno quer aprender…)" aria-label="Observações" disabled={!dados.podeEscrever} />
              <input name="link" maxLength={500} placeholder="Link (vídeo, cifra, partitura…) — opcional" aria-label="Link" disabled={!dados.podeEscrever} />
              <button className="btn-entrar" style={{ width: "auto", marginTop: 0, alignSelf: "flex-start" }} disabled={!dados.podeEscrever}>
                Salvar anotação
              </button>
            </form>

            {comAnotacao.length > 0 && (
              <nav className="filtros" aria-label="Filtrar por aluno">
                <Link href="/aulas" className={`filtro ${filtro ? "" : "ativo"}`}>
                  Todos
                </Link>
                {comAnotacao.map((n) => (
                  <Link key={n} href={`/aulas?aluno=${encodeURIComponent(n)}`} className={`filtro ${chaveAluno(n) === chaveAluno(filtro) && filtro ? "ativo" : ""}`}>
                    {n}
                  </Link>
                ))}
              </nav>
            )}

            <section>
              <h2 className="subtitulo">Para a próxima aula ({pendentes.length})</h2>
              {pendentes.length === 0 ? (
                <div className="aviso">Nenhum pedido pendente{filtro ? ` para ${filtro}` : ""}.</div>
              ) : (
                <ul className="lista-itens">
                  {pendentes.map((a) => (
                    <Cartao key={a.id} a={a} ativo={dados.podeEscrever} filtro={filtro} />
                  ))}
                </ul>
              )}
            </section>

            {feitas.length > 0 && (
              <details className="resolvidos">
                <summary>Já feitas ({feitas.length})</summary>
                <ul className="lista-itens">
                  {feitas.map((a) => (
                    <Cartao key={a.id} a={a} ativo={dados.podeEscrever} filtro={filtro} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
