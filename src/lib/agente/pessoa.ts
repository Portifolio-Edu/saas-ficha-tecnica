// AGENTE IA (2026-09-26): quem pode falar com o agente e como vira passe.
import type { ClienteAtual } from "@/lib/dados/cliente";
import type { Papel } from "@/lib/auth/papeis";
import { assinarPasse, type CanalAgente } from "./passe";
import { configAgente } from "./config";

export const PAPEIS_DO_AGENTE: Papel[] = ["dono", "gestor", "estoquista"];

export function passeDaPessoa(c: Pick<ClienteAtual, "id" | "userId" | "papel" | "nomeMembro" | "nomeRestaurante">, canal: CanalAgente): string {
  return assinarPasse({ u: c.userId, c: c.id, p: c.papel, n: c.nomeMembro, r: c.nomeRestaurante, canal }, configAgente().segredo);
}
