// Formatadores compartilhados pra eixo, tooltip e rotulo de valor -- nenhum
// grafico deve formatar R$/% na mao, pra nao divergir do padrao (milhar,
// casas decimais, sinal de porcentagem).

export function formatBRLEixo(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function formatBRL(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentEixo(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

export function formatPercent(valor: number, casasDecimais = 1): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais })}%`;
}
