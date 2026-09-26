// Formatadores compartilhados pra eixo, tooltip e rotulo de valor -- nenhum
// grafico deve formatar R$/% na mao, pra nao divergir do padrao (milhar,
// casas decimais, sinal de porcentagem).

export function formatBRLEixo(valor: number): string {
  return `R$\u00A0${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function formatBRL(valor: number): string {
  // Espaço não-quebrável: "R$" nunca fica numa linha e o número na outra.
  return `R$\u00A0${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentEixo(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

export function formatPercent(valor: number, casasDecimais = 1): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casasDecimais, maximumFractionDigits: casasDecimais })}%`;
}

// SISTEMA premium (2026-09-22): número em pt-BR com casas fixas ("1,12", "18,2").
// Substitui os .toFixed() de exibição espalhados nas telas, que mostravam ponto
// decimal ("FC 1.12", "margem 81.8%"). Não usar em value de <input type="number">,
// que exige ponto.
export function formatNumero(valor: number, casas = 1): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// SISTEMA premium: quantidade (peso, volume, unidade) em pt-BR, até 3 casas e sem
// zeros sobrando ("0,15", "1,2", "18"). Antes as telas imprimiam o número cru ("0.15").
export function formatQtd(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
