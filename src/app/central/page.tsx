import Link from "next/link";
import { carregarMeuDia, nivelDoScore, type ItemCentral, type Nivel } from "@/lib/central";
import { adiar, anotar, concluir, ignorar } from "./actions";

export const dynamic = "force-dynamic";

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const NIVEL_ROTULO: Record<Nivel, string> = { critico: "🔴 Crítico", importante: "🟠 Importante", aguardar: "🟡 Pode aguardar" };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function saudacao(hoje: string): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  const base = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const d = new Date(`${hoje}T12:00:00Z`);
  return `${base}, Bruno — ${DIAS_SEMANA[d.getUTCDay()]}, ${hoje.slice(8, 10)}/${hoje.slice(5, 7)}`;
}

function quando(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

function Acoes({ item, ativo }: { item: ItemCentral; ativo: boolean }) {
  const oculto = <input type="hidden" name="key" value={item.key} />;
  return (
    <div className="acoes">
      <form action={concluir}>
        {oculto}
        <button className="btn-acao principal" disabled={!ativo}>
          Concluir
        </button>
      </form>
      <form action={adiar}>
        {oculto}
        <input type="hidden" name="dias" value="1" />
        <button className="btn-acao" disabled={!ativo}>
          Adiar 1 dia
        </button>
      </form>
      <form action={adiar}>
        {oculto}
        <input type="hidden" name="dias" value="3" />
        <button className="btn-acao" disabled={!ativo}>
          Adiar 3 dias
        </button>
      </form>
      <form action={ignorar}>
        {oculto}
        <button className="btn-acao" disabled={!ativo}>
          Ignorar
        </button>
      </form>
      {item.href && /^https?:\/\//.test(item.href) && (
        <a className="link-origem" href={item.href} rel="noopener">
          Abrir origem →
        </a>
      )}
    </div>
  );
}

function Linha({ item, pos, ativo }: { item: ItemCentral; pos?: number; ativo: boolean }) {
  const nivel = nivelDoScore(item.score);
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
            {item.porque && ` — ${item.porque}`}
            {item.valor > 0 && !item.detalhe.includes("R$") && !item.porque.includes("R$") && ` · ${brl.format(item.valor)}`}
          </p>
        </div>
        <span className="chip-area">{item.anotacao ? "anotação" : item.area}</span>
      </div>
      <Acoes item={item} ativo={ativo} />
    </li>
  );
}

export default async function CentralPage() {
  const dia = await carregarMeuDia();
  const criticos = dia.itens.filter((i) => nivelDoScore(i.score) === "critico").length;
  const top = dia.itens.slice(0, 5);
  const resto = dia.itens.slice(5);

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

      {!dia.ok && <div className="aviso">{dia.erro}</div>}

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
            <input name="prazo" type="date" aria-label="Prazo (opcional)" disabled={!dia.podeEscrever} />
            <button className="btn-entrar" style={{ width: "auto", marginTop: 0 }} disabled={!dia.podeEscrever}>
              Anotar
            </button>
          </form>

          <section>
            <h2 className="subtitulo">🎯 Top 5 do dia</h2>
            {top.length === 0 ? (
              <div className="aviso">Nada exigindo atenção agora. 🎉</div>
            ) : (
              <ul className="lista-itens">
                {top.map((i, n) => (
                  <Linha key={i.key} item={i} pos={n + 1} ativo={dia.podeEscrever} />
                ))}
              </ul>
            )}
          </section>

          {dia.aguardando.length > 0 && (
            <section>
              <h2 className="subtitulo">⏳ Aguardando terceiros</h2>
              <ul className="lista-itens">
                {dia.aguardando.map((i) => (
                  <li key={i.key} className="item item-aguardar">
                    <p className="item-titulo">
                      {i.quem ? `${i.quem} — ` : ""}
                      {i.titulo}
                    </p>
                    {i.detalhe && <p className="item-detalhe">{i.detalhe}</p>}
                    <p className="item-meta">
                      {i.ultimoContato && `último contato ${i.ultimoContato.slice(8, 10)}/${i.ultimoContato.slice(5, 7)}`}
                      {i.lembrarEm && ` · lembrar em ${i.lembrarEm.slice(8, 10)}/${i.lembrarEm.slice(5, 7)}`}
                    </p>
                    <Acoes item={i} ativo={dia.podeEscrever} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {resto.length > 0 && (
            <section>
              <h2 className="subtitulo">Outras pendências ({resto.length})</h2>
              <ul className="lista-itens">
                {resto.map((i) => (
                  <Linha key={i.key} item={i} ativo={dia.podeEscrever} />
                ))}
              </ul>
            </section>
          )}

          <p className="rodape" style={{ marginTop: 28 }}>
            {dia.atualizadoEm ? `Dados do assistente atualizados em ${quando(dia.atualizadoEm)}.` : "Aguardando a primeira atualização do assistente."}
          </p>
        </>
      )}
    </main>
    </div>
  );
}
