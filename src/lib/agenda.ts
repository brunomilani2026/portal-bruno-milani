/**
 * Compromissos do Google Calendar que NÃO são aula de aluno nem show (barbeiro, médico etc.).
 * Basta o título conter uma destas palavras (sem diferenciar acento/maiúsculas) ou terminar com "(pessoal)".
 * Para incluir mais, acrescente a palavra na lista.
 */
const PALAVRAS_PESSOAIS = [
  "barba",
  "barbeiro",
  "cabelo",
  "corte de cabelo",
  "dentista",
  "medico",
  "medica",
  "consulta",
  "exame",
  "fisio",
  "academia",
  "treino",
  "futebol",
  "almoco",
  "jantar",
  "cafe com",
  "reuniao",
  "mercado",
  "banco",
  "oficina",
  "aniversario",
  "casamento de",
  "viagem",
  "pessoal",
];

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ehCompromissoPessoal(titulo: string): boolean {
  const t = semAcento(titulo);
  return PALAVRAS_PESSOAIS.some((p) => new RegExp(`(^|[^a-z])${p}([^a-z]|$)`).test(t));
}
