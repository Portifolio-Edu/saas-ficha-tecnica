// EQUIPE (2026-09-25): quem vê qual tela. Arquivo puro (sem Supabase), usado
// pelo servidor (exigirAcesso) e pelo menu (ShellPremium) — a mesma regra nos
// dois lugares. O bloqueio de verdade é a RLS do banco
// (supabase/migrations/20260925120000_equipe_papeis.sql); isto aqui só evita
// mostrar tela que viria vazia ou com erro.
// Onde mexer: ROTAS_ESTOQUISTA. Reverter: git revert do commit "app: telas por papel".

export type Papel = "dono" | "gestor" | "estoquista" | "cozinha";

export const ROTULO_PAPEL: Record<Papel, string> = {
  dono: "Dono",
  gestor: "Gestor",
  estoquista: "Estoquista",
  cozinha: "Cozinha",
};

export const DESCRICAO_PAPEL: Record<Papel, string> = {
  dono: "Vê tudo e cuida da equipe e da assinatura.",
  gestor: "Vê tudo da operação: custos, margem, faturamento, relatórios e CMV.",
  estoquista: "Compras e estoque, e o CMV do estoque. Não vê faturamento, margem, preço de venda nem relatórios.",
  cozinha: "Aparelho da cozinha, sem senha: checklists, temperaturas, produção, fichas sem custo e contagem cega.",
};

/** Compras e estoque, e o CMV do lado do estoque (sem faturamento). */
export const ROTAS_ESTOQUISTA = ["/estoque", "/insumos", "/proteinas", "/cmv"];

export function ehGestao(papel: Papel): boolean {
  return papel === "dono" || papel === "gestor";
}

/** Primeira tela depois do login. */
export function rotaInicial(papel: Papel): string {
  if (papel === "cozinha") return "/cozinha";
  if (papel === "estoquista") return "/estoque";
  return "/visao-geral";
}

/** `rota` sem o prefixo /preview. Equipe só pra gestão; cozinha só no /cozinha. */
export function podeAcessar(papel: Papel, rota: string): boolean {
  if (rota.startsWith("/cozinha")) return true;
  if (papel === "cozinha") return false;
  if (ehGestao(papel)) return true;
  return ROTAS_ESTOQUISTA.some((r) => rota === r || rota.startsWith(`${r}/`));
}
