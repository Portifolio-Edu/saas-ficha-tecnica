// AGENTE IA (2026-09-26): WhatsApp de cada pessoa. A pessoa informa o número
// na tela, recebe um código de 6 dígitos e manda "ATIVAR 123456" pro número do
// agente — isso prova que o número é dela. Só número verificado identifica
// alguém. O código fica no banco só como hash e vale 15 minutos.
import { createHash, randomInt } from "node:crypto";

export const VALIDADE_CODIGO_MIN = 15;

export function gerarCodigo(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(codigo.replace(/\D/g, "")).digest("hex");
}

/** Número como o WhatsApp manda ("5511988887777@s.whatsapp.net") → só dígitos com 55. */
export function numeroDoWhatsapp(bruto: string): string {
  const d = bruto.split("@")[0].replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

/** Celular BR com e sem o 9º dígito (o WhatsApp às vezes manda sem). */
export function variantesTelefone(t: string): string[] {
  const d = numeroDoWhatsapp(t);
  if (/^55\d{2}9\d{8}$/.test(d)) return [d, d.slice(0, 4) + d.slice(5)];
  if (/^55\d{2}[6-9]\d{7}$/.test(d)) return [d, `${d.slice(0, 4)}9${d.slice(4)}`];
  return [d];
}

/** "ATIVAR 123456", "ativar 123 456", "Ativar: 123456" → "123456". */
export function codigoDaMensagem(texto: string): string | null {
  const m = texto.trim().match(/^ativar\W*([\d\s]{6,9})\s*$/i);
  if (!m) return null;
  const codigo = m[1].replace(/\s/g, "");
  return codigo.length === 6 ? codigo : null;
}
