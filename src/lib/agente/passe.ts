// AGENTE IA (2026-09-26): passe assinado que identifica, a cada mensagem, QUEM
// está falando com o agente (pessoa, restaurante, papel e canal). O app gera
// e assina (HMAC-SHA256 com AGENTE_SEGREDO, que só o app conhece); o n8n só
// repassa o passe nas chamadas das ferramentas. Sem o segredo não dá pra
// forjar nem trocar o restaurante. Validade curta (15 min).
// Formato: base64url(json) + "." + base64url(hmac).
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Papel } from "@/lib/auth/papeis";

export type CanalAgente = "web" | "whatsapp";

export interface PasseAgente {
  v: 1;
  /** auth.users.id */
  u: string;
  /** clientes.id (restaurante) */
  c: string;
  p: Papel;
  /** Nome da pessoa e do restaurante (pro agente chamar pelo nome). */
  n: string;
  r: string;
  canal: CanalAgente;
  /** Expira em (segundos desde 1970). */
  exp: number;
}

export const VALIDADE_PASSE_SEG = 15 * 60;

const b64 = (s: Buffer | string) => Buffer.from(s).toString("base64url");

function assinatura(corpo: string, segredo: string): string {
  return createHmac("sha256", segredo).update(corpo).digest("base64url");
}

export function assinarPasse(dados: Omit<PasseAgente, "v" | "exp">, segredo: string, agora = Date.now(), validadeSeg = VALIDADE_PASSE_SEG): string {
  if (!segredo || segredo.length < 32) throw new Error("AGENTE_SEGREDO precisa ter pelo menos 32 caracteres.");
  const passe: PasseAgente = { v: 1, ...dados, exp: Math.floor(agora / 1000) + validadeSeg };
  const corpo = b64(JSON.stringify(passe));
  return `${corpo}.${assinatura(corpo, segredo)}`;
}

/** null = inválido, adulterado ou vencido. */
export function verificarPasse(passe: string | null | undefined, segredo: string, agora = Date.now()): PasseAgente | null {
  if (!passe || !segredo || passe.length > 2048) return null;
  const partes = passe.split(".");
  if (partes.length !== 2) return null;
  const [corpo, sig] = partes;
  const esperado = Buffer.from(assinatura(corpo, segredo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as PasseAgente;
    if (dados.v !== 1 || typeof dados.u !== "string" || typeof dados.c !== "string" || typeof dados.exp !== "number") return null;
    if (dados.exp * 1000 <= agora) return null;
    return dados;
  } catch {
    return null;
  }
}

/** Compara a chave que o n8n manda (x-ft-chave) com AGENTE_CHAVE_N8N, sem vazar pelo tempo. */
export function chaveN8nConfere(recebida: string | null, esperada: string | undefined): boolean {
  if (!recebida || !esperada || esperada.length < 32) return false;
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}
