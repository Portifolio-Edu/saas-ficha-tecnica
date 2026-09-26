// PLANO 9,5 (2026-09-28): destino depois do link do e-mail (?next=). Antes a
// regra era "começa com / e não com //", mas "/\site.com" passava e o
// navegador lê a barra invertida como "//": ia parar em site de fora (open
// redirect, bom pra phishing com link legítimo nosso). Agora resolve o
// caminho de verdade e só aceita se continuar no mesmo site.
// Onde mexer: PADRAO (destino quando o next não serve).

const PADRAO = "/visao-geral";

export function caminhoInterno(bruto: string | null | undefined): string {
  if (!bruto || !bruto.startsWith("/") || /[\\\u0000-\u001f]/.test(bruto)) return PADRAO;
  const base = "http://interno.invalid";
  let destino: URL;
  try {
    destino = new URL(bruto, base);
  } catch {
    return PADRAO;
  }
  if (destino.origin !== base) return PADRAO;
  return `${destino.pathname}${destino.search}${destino.hash}`;
}
