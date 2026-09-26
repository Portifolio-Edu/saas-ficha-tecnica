// PLANO 9,5 (2026-09-26): telefone brasileiro num formato só, em todo o
// sistema (cadastro do restaurante, banco de extras): dígitos com 55 + DDD.
// "(11) 98765-4321", "11987654321" e "+55 11 98765-4321" viram o mesmo
// "5511987654321" — assim o "telefone único" do cadastro funciona de verdade.
// O banco repete a mesma regra (função telefone_normalizado, migration
// 20260927110000_telefone_cliente).

/** "(11) 98765-4321" → "5511987654321". Sem DDD ou curto demais volta só os dígitos. */
export function normalizarTelefone(t: string): string {
  const d = t.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/** Celular ou fixo com DDD (com ou sem 55). */
export function telefoneValido(t: string): boolean {
  return /^\d{12,13}$/.test(normalizarTelefone(t));
}

export function formatarTelefone(t: string): string {
  const d = t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}
