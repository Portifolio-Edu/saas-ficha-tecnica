// DESEMPENHO (2026-10-02): número e data em pt-BR com formatador
// reaproveitado. `valor.toLocaleString("pt-BR", {…})` monta um formatador
// novo a cada chamada; numa tabela com centenas de números isso custava
// ~100 ms (CPU 4x) só em Estoque, e o toque esperava. O resultado é idêntico
// (é o mesmo Intl por baixo). Regra de lint em eslint.config.mjs barra o
// jeito antigo. Ver docs/DESEMPENHO.md.

const numeros = new Map<string, Intl.NumberFormat>();
const datas = new Map<string, Intl.DateTimeFormat>();

/** Igual a `valor.toLocaleString("pt-BR", opcoes)`, sem montar formatador a cada número. */
export function numeroBR(valor: number, opcoes: Intl.NumberFormatOptions = {}): string {
  const chave = JSON.stringify(opcoes);
  let f = numeros.get(chave);
  if (!f) numeros.set(chave, (f = new Intl.NumberFormat("pt-BR", opcoes)));
  return f.format(valor);
}

/** Formatador de data/hora reaproveitado (mesmo resultado de `new Intl.DateTimeFormat(local, opcoes)`). */
export function formatadorData(opcoes: Intl.DateTimeFormatOptions = {}, local = "pt-BR"): Intl.DateTimeFormat {
  const chave = `${local}|${JSON.stringify(opcoes)}`;
  let f = datas.get(chave);
  if (!f) datas.set(chave, (f = new Intl.DateTimeFormat(local, opcoes)));
  return f;
}

/**
 * Igual a `new Date(data).toLocaleString("pt-BR", opcoes)` quando `opcoes` diz
 * os campos (dia, hora…). Sem campos, mostra só a data (dd/mm/aaaa), como
 * `toLocaleDateString("pt-BR")`.
 */
export function dataBR(data: Date | string | number, opcoes: Intl.DateTimeFormatOptions = {}): string {
  return formatadorData(opcoes).format(data instanceof Date ? data : new Date(data));
}

/** Hora e minuto ("14:05"), como `toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })`. */
export function horaBR(data: Date | string | number, opcoes: Intl.DateTimeFormatOptions = {}): string {
  return dataBR(data, { hour: "2-digit", minute: "2-digit", ...opcoes });
}
