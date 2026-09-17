// Tokens de tema como CSS custom properties, definidas em globals.css
// (:root para claro, [data-theme="dark"] para escuro). Componentes usam
// var(--token) diretamente; o que sobra aqui são só os helpers derivados
// que combinam mais de um token.
export const shadow = "var(--shadow)";
export const nums = { fontVariantNumeric: "tabular-nums" } as const;
export const inputStyle = { border: "1px solid var(--border-strong)", background: "var(--panel)" };
