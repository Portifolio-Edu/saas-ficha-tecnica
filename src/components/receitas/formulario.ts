import type { LinhaFichaInput } from "@/lib/dominio/receita";

export type LinhaEdicao = Omit<LinhaFichaInput, "pesoLiquido"> & {
  quantidade: string;
};

/** Aceita a vírgula da bancada sem truncar 1,5 para 1; vazio não é zero. */
export function numeroDoCampo(valor: string): number {
  const texto = valor.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(texto)) return NaN;
  return Number(texto.replace(",", "."));
}

export interface CamposReceita {
  nome: string;
  precoVenda: string;
  rendimento: string;
  pesoPorcaoG: string;
  vendasMes: string;
  ficha: LinhaEdicao[];
}

export function validarCamposReceita(
  campos: CamposReceita,
): Record<string, string> {
  const erros: Record<string, string> = {};
  if (!campos.nome.trim()) erros.nome = "Informe o nome do prato.";
  const preco = numeroDoCampo(campos.precoVenda);
  if (!Number.isFinite(preco) || preco < 0)
    erros.precoVenda = "Informe um preço válido, igual ou maior que zero.";
  const rendimento = numeroDoCampo(campos.rendimento);
  if (!Number.isFinite(rendimento) || rendimento <= 0)
    erros.rendimento = "Informe um rendimento maior que zero.";
  const peso = numeroDoCampo(campos.pesoPorcaoG);
  if (campos.pesoPorcaoG.trim() && (!Number.isFinite(peso) || peso <= 0))
    erros.pesoPorcaoG = "Informe um peso maior que zero ou deixe vazio.";
  const vendas = numeroDoCampo(campos.vendasMes);
  if (campos.vendasMes.trim() && (!Number.isInteger(vendas) || vendas < 0))
    erros.vendasMes = "Informe um número inteiro, igual ou maior que zero.";
  if (!campos.ficha.length)
    erros.ficha = "Adicione pelo menos um ingrediente ou preparo próprio.";
  campos.ficha.forEach((linha, idx) => {
    const quantidade = numeroDoCampo(linha.quantidade);
    if (!Number.isFinite(quantidade) || quantidade <= 0)
      erros[`linha-${idx}`] = "Informe uma quantidade maior que zero.";
  });
  return erros;
}
