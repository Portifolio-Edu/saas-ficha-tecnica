// Tokens de tema como CSS custom properties, definidas em globals.css
// (:root para claro, [data-theme="dark"] para escuro). Componentes usam
// var(--token) diretamente; o que sobra aqui são só os helpers derivados
// que combinam mais de um token.
export const shadow = "var(--shadow)";
export const shadowLift = "var(--shadow-lift)";
// Geist Mono (já carregada em layout.tsx) pros números de verdade: preço, %,
// quantidade -- diferencia dado numérico de texto corrido, comum em
// dashboard financeiro, e os algarismos monoespaçados alinham em coluna
// mesmo sem tabela.
export const nums = { fontVariantNumeric: "tabular-nums", fontFamily: "var(--fonte-numero), ui-monospace, monospace" } as const;
export const inputStyle = { border: "1px solid var(--border-strong)", background: "var(--panel)" };
