import Link from "next/link";
import { formatarDataLonga, listarBriefings } from "@/lib/briefing";

export const dynamic = "force-dynamic";

export default async function BriefingPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const resultado = await listarBriefings();

  return (
    <main className="pagina">
      <p className="voltar">
        <Link href="/">← Meus sistemas</Link>
      </p>
      <header className="topo">
        <h1 className="titulo">📬 Briefing</h1>
        <p className="sub">O resumo do seu dia, sempre aqui.</p>
      </header>

      {!resultado.ok && (
        <div className="aviso" role="status">
          {resultado.motivo === "sem-token"
            ? "A página ainda não está conectada ao banco do Briefing (falta cadastrar a chave na Vercel)."
            : "Não consegui carregar os briefings agora. Tente recarregar em instantes."}
        </div>
      )}

      {resultado.ok && resultado.briefings.length === 0 && (
        <div className="aviso" role="status">
          Nenhum briefing guardado ainda. O primeiro aparece aqui depois do próximo envio das 08:30.
        </div>
      )}

      {resultado.ok && resultado.briefings.length > 0 && (() => {
        const lista = resultado.briefings;
        const atual = lista.find((b) => b.data === d) ?? lista[0];
        return (
          <>
            <article className="briefing">
              <p className="briefing-data">{formatarDataLonga(atual.data)}</p>
              {atual.urgentes > 0 && <span className="etiqueta">🔴 {atual.urgentes} crítico{atual.urgentes > 1 ? "s" : ""}</span>}
              {atual.resumo && <p className="briefing-resumo">{atual.resumo}</p>}
              <div className="briefing-texto">{atual.conteudo}</div>
            </article>

            {lista.length > 1 && (
              <section aria-label="Briefings anteriores">
                <h2 className="subtitulo">Dias anteriores</h2>
                <ul className="historico">
                  {lista
                    .filter((b) => b.data !== atual.data)
                    .map((b) => (
                      <li key={b.data}>
                        <Link href={`/briefing?d=${b.data}`}>
                          <span>{formatarDataLonga(b.data)}</span>
                          {b.urgentes > 0 && <span className="mini">🔴 {b.urgentes}</span>}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </>
        );
      })()}
    </main>
  );
}
