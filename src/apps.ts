/**
 * Lista dos sistemas do portal. Para adicionar um novo, basta incluir mais um item aqui
 * (e o endereço correspondente nas variáveis de ambiente).
 * O portal só guarda links: não lê nem grava dados dos sistemas.
 */
export type SistemaApp = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  /** endereço vindo das variáveis de ambiente; vazio = cartão mostra "configurar endereço" */
  href: string;
  /** "em-breve" = sistema ainda não existe */
  situacao: "ativo" | "em-breve";
};

export function listarSistemas(): SistemaApp[] {
  return [
    {
      id: "financas",
      nome: "Finanças",
      descricao: "Contas, shows, alunos, Hotmart e despesas.",
      icone: "💰",
      href: process.env.URL_FINANCAS || "https://financas-pessoais-bruno-milani.vercel.app/",
      situacao: "ativo",
    },
    {
      id: "briefing",
      nome: "Briefing",
      descricao: "O resumo diário: o que exige a sua atenção.",
      icone: "📬",
      href: process.env.URL_BRIEFING || "/briefing",
      situacao: "ativo",
    },
    {
      id: "partitura",
      nome: "Partitura Pro Cavaco",
      descricao: "Partituras e cifras do Cavaco Cifrado.",
      icone: "🎼",
      href: process.env.URL_PARTITURA_CAVACO || "https://app.partituraprocavaco.com.br/",
      situacao: "ativo",
    },
    {
      id: "agenda-pro-music",
      nome: "Agenda Pro Music",
      descricao: "Agenda, alunos e cobranças das aulas.",
      icone: "📅",
      href: process.env.URL_AGENDA_PRO_MUSIC || "https://www.agendapromusic.com.br/",
      situacao: "ativo",
    },
    {
      id: "site",
      nome: "Site Bruno Milani",
      descricao: "Produtos, aulas online e e-books.",
      icone: "🌐",
      href: process.env.URL_SITE || "https://brunomilani.com.br/",
      situacao: "ativo",
    },
    {
      id: "crm",
      nome: "CRM de Vendas",
      descricao: "Leads, propostas e fechamentos.",
      icone: "🤝",
      href: process.env.URL_CRM ?? "",
      situacao: "em-breve",
    },
  ];
}
