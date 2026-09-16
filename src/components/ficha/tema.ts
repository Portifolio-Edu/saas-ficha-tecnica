// Paleta e constantes de estilo portadas verbatim de ficha-tecnica-mvp.jsx.
// Cinza faz quase todo o trabalho de hierarquia; accent e danger são as duas
// únicas cores com significado. Não redesenhar: qualquer tela nova reusa
// exatamente isto, em vez de inventar uma paleta própria.
export const C = {
  bg: "#FAFAFA",
  panel: "#FFFFFF",
  border: "#ECECEE",
  borderStrong: "#DEDEE2",
  text: "#0D0D0F",
  sub: "#6E6E76",
  faint: "#A3A3AA",
  accent: "#2F5233",
  accentSoft: "#EAF0EA",
  danger: "#9A2E1F",
  dangerSoft: "#FBECE8",
} as const;

export const shadow = "0 1px 2px rgba(13,13,15,0.03), 0 6px 16px rgba(13,13,15,0.04)";
export const nums = { fontVariantNumeric: "tabular-nums" } as const;

export const inputStyle = { border: `1px solid ${C.borderStrong}`, background: C.panel };
