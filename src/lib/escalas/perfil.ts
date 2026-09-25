// PERFIL (2026-09-27): prontuário de competências de cada pessoa da equipe.
// Puro (sem Supabase): usado na tela, na demo, nas server actions e no
// matchmaking de extras (./extras.ts).
//
// O que é: nível técnico, praças de domínio (hard skills), pontos fortes,
// gargalos/limitações, observação interna do gestor e notas rápidas de
// assiduidade e postura. Fica numa tabela só de dono/gestor
// (perfil_funcionario e perfil_notas); a cozinha e o estoquista nunca veem.
// LGPD: aqui vai desempenho no trabalho, nunca saúde, diagnóstico ou CID.
import type { DataISO, Nivel, Setor } from "./tipos";

export const NIVEIS: { id: Nivel; rotulo: string; descricao: string }[] = [
  { id: "junior", rotulo: "Júnior", descricao: "Executa bem com supervisão" },
  { id: "pleno", rotulo: "Pleno", descricao: "Segura a praça no dia a dia" },
  { id: "senior", rotulo: "Sênior", descricao: "Segura pico e ensina quem chega" },
  { id: "especialista", rotulo: "Especialista", descricao: "Referência técnica da casa" },
];

/** Ordem pra comparar ("pleno ou acima"). */
export const ORDEM_NIVEL: Record<Nivel, number> = { junior: 1, pleno: 2, senior: 3, especialista: 4 };
export const rotuloNivel = (n: Nivel | null | undefined) => (n ? (NIVEIS.find((x) => x.id === n)?.rotulo ?? n) : null);

/** Praças de domínio sugeridas por setor. Dá pra acrescentar outras. */
export const PRACAS: Record<Setor, string[]> = {
  cozinha: [
    "Cozinha quente", "Cozinha fria", "Grelha", "Chapa", "Fritura", "Forno a lenha", "Massas", "Molhos e fundos",
    "Confeitaria", "Panificação", "Sushi", "Pré-preparo", "Porcionamento", "Expedição (passe)",
  ],
  salao: ["Atendimento", "Maître", "Recepção", "Caixa", "Vinhos", "Delivery", "Eventos"],
  bar: ["Coquetelaria", "Drinks clássicos", "Café / barista", "Chope", "Vinhos"],
  outro: ["Limpeza", "Lavagem (copa)", "Segurança", "Manutenção", "Estoque", "Recebimento"],
};

export const PONTOS_FORTES = [
  "Agilidade sob pressão",
  "Segura a praça sozinho",
  "Mantém a praça limpa",
  "Ótimo com clientes",
  "Ensina bem",
  "Organizado no mise en place",
  "Padrão de empratamento",
  "Pontual",
  "Cobre outras praças",
  "Controla desperdício",
];

export const LIMITACOES = [
  "Precisa de supervisão no pico",
  "Não opera sozinho na chapa",
  "Dificuldade com horários",
  "Lento no fechamento",
  "Esquece etiquetagem",
  "Comunicação com a equipe",
  "Ainda não domina as fichas",
];

export type TipoNota = "pontualidade" | "postura" | "elogio" | "atencao";
export const TIPOS_NOTA: { id: TipoNota; rotulo: string }[] = [
  { id: "elogio", rotulo: "Elogio" },
  { id: "pontualidade", rotulo: "Pontualidade" },
  { id: "postura", rotulo: "Postura" },
  { id: "atencao", rotulo: "Ponto de atenção" },
];

export interface PerfilCompetencia {
  nivel: Nivel | null;
  pracas: string[];
  pontosFortes: string[];
  limitacoes: string[];
  observacoes: string | null;
  atualizadoEm: string | null;
}

export interface NotaPerfil {
  id: string;
  funcionarioId: string;
  data: DataISO;
  tipo: TipoNota;
  texto: string;
  autor: string | null;
  criadoEm: string;
}

export type PerfilInput = Omit<PerfilCompetencia, "atualizadoEm">;
export type NotaInput = Pick<NotaPerfil, "funcionarioId" | "data" | "tipo" | "texto">;

export const PERFIL_VAZIO: PerfilCompetencia = { nivel: null, pracas: [], pontosFortes: [], limitacoes: [], observacoes: null, atualizadoEm: null };

export const LIMITES = { tags: 20, tag: 40, observacoes: 2000, nota: 500 } as const;

/** "  segura   a praça " → "Segura a praça". */
export function limparTag(t: string): string {
  const s = t.replace(/\s+/g, " ").trim().slice(0, LIMITES.tag);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Chave pra comparar tags ignorando maiúsculas e acentos ("Chapa" = "chapa"). */
export function chaveTag(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Sem repetidas (mesma chave), na ordem em que vieram. */
export function tagsUnicas(tags: string[]): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const t of tags.map(limparTag)) {
    const k = chaveTag(t);
    if (!k || vistas.has(k)) continue;
    vistas.add(k);
    out.push(t);
  }
  return out;
}

export function validarPerfil(p: PerfilInput): string | null {
  if (p.nivel !== null && !NIVEIS.some((n) => n.id === p.nivel)) return "Nível inválido.";
  for (const [nome, lista] of [["praças", p.pracas], ["pontos fortes", p.pontosFortes], ["limitações", p.limitacoes]] as const) {
    if (lista.length > LIMITES.tags) return `No máximo ${LIMITES.tags} ${nome}.`;
    if (lista.some((t) => !t.trim() || t.length > LIMITES.tag)) return `Cada item de ${nome} com 1 a ${LIMITES.tag} caracteres.`;
  }
  if (p.observacoes && p.observacoes.length > LIMITES.observacoes) return `Observação com no máximo ${LIMITES.observacoes} caracteres.`;
  return null;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function validarNota(n: NotaInput, hoje: DataISO): string | null {
  if (!n.funcionarioId) return "Escolha a pessoa.";
  if (!TIPOS_NOTA.some((t) => t.id === n.tipo)) return "Escolha o tipo da nota.";
  if (!DATA.test(n.data) || Number.isNaN(Date.parse(`${n.data}T00:00:00Z`))) return "Informe a data.";
  if (n.data > hoje) return "A nota não pode ser de um dia que ainda não chegou.";
  if (!n.texto.trim()) return "Escreva a nota.";
  if (n.texto.trim().length > LIMITES.nota) return `Nota com no máximo ${LIMITES.nota} caracteres.`;
  return null;
}

/** Deixa o perfil pronto pra gravar (tags limpas e sem repetição). */
export function normalizarPerfil(p: PerfilInput): PerfilInput {
  return {
    nivel: p.nivel,
    pracas: tagsUnicas(p.pracas),
    pontosFortes: tagsUnicas(p.pontosFortes),
    limitacoes: tagsUnicas(p.limitacoes),
    observacoes: p.observacoes?.trim() || null,
  };
}

/** Assiduidade a partir do prontuário de ocorrências (últimos `dias` dias). */
export function resumoAssiduidade(
  ocorrencias: { funcionarioId: string; tipo: string; inicio: DataISO; fim: DataISO }[],
  funcionarioId: string,
  hoje: DataISO,
  dias = 90,
): { faltas: number; atestados: number; desde: DataISO } {
  const desde = new Date(Date.parse(`${hoje}T00:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10);
  const minhas = ocorrencias.filter((o) => o.funcionarioId === funcionarioId && o.fim >= desde && o.inicio <= hoje);
  const diasDe = (tipo: string) =>
    minhas
      .filter((o) => o.tipo === tipo)
      .reduce((s, o) => {
        const a = Math.max(Date.parse(`${o.inicio}T00:00:00Z`), Date.parse(`${desde}T00:00:00Z`));
        const b = Math.min(Date.parse(`${o.fim}T00:00:00Z`), Date.parse(`${hoje}T00:00:00Z`));
        return s + Math.round((b - a) / 86_400_000) + 1;
      }, 0);
  return { faltas: diasDe("falta"), atestados: diasDe("atestado"), desde };
}
