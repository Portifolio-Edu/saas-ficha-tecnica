// EQUIPE (2026-09-25): tipos puros da equipe — sem Supabase, pra poder ir pro
// componente cliente (mesmo motivo de src/lib/dominio/insumo.ts).
import type { Papel } from "@/lib/auth/papeis";

export interface Membro {
  id: string;
  userId: string;
  papel: Papel;
  nome: string;
  usuario: string | null;
  ativo: boolean;
  criadoEm: string;
}

/** Nome de quem trabalha na cozinha (sem login), pra "quem está fazendo". */
export interface Funcionario {
  id: string;
  nome: string;
}

export interface NovoAcessoInput {
  nome: string;
  usuario: string;
  senha: string;
  papel: "gestor" | "estoquista";
}

/** Código de uso único pra ligar um aparelho ao modo cozinha. */
export interface CodigoCozinha {
  codigo: string;
  expiraEm: string;
}
