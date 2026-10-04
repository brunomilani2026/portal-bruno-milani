import { listarSistemas, type SistemaApp } from "@/apps";
import { sair } from "./login/actions";

function hora(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Cartao({ s }: { s: SistemaApp }) {
  const conteudo = (
    <>
      <span className="icone" aria-hidden="true">
        {s.icone}
      </span>
      <h2>{s.nome}</h2>
      <p>{s.descricao}</p>
      {s.situacao === "em-breve" && <span className="etiqueta">Em breve</span>}
      {s.situacao === "ativo" && !s.href && <span className="etiqueta">Configurar endereço</span>}
    </>
  );

  if (s.situacao === "ativo" && s.href) {
    return (
      <a className="cartao" href={s.href} rel="noopener">
        {conteudo}
      </a>
    );
  }
  return <div className="cartao inativo">{conteudo}</div>;
}

export default function Home() {
  const sistemas = listarSistemas();
  return (
    <div className="tela-neutra">
    <main className="pagina">
      <header className="topo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="Bruno Milani" />
        <h1 className="titulo">{hora()}, Bruno</h1>
        <p className="sub">Para onde você quer ir?</p>
      </header>

      <section className="grade" aria-label="Meus sistemas">
        {sistemas.map((s) => (
          <Cartao key={s.id} s={s} />
        ))}
      </section>

      <footer className="rodape">
        <form action={sair}>
          <button className="btn-sair">Sair</button>
        </form>
      </footer>
    </main>
    </div>
  );
}
