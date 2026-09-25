"use client";

// EQUIPE (2026-09-25): primeira vez do aparelho na cozinha. O gestor gera o
// código na tela Equipe; aqui digita uma vez e o aparelho fica no modo
// cozinha, sem senha.

import { useActionState } from "react";
import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { acaoParearAparelho } from "./actions";

export function PareamentoForm() {
  const [estado, formAction, pendente] = useActionState(acaoParearAparelho, {});

  return (
    <CartaoAuth titulo="Conectar este aparelho à cozinha" subtitulo="Peça o código ao dono ou gestor. Ele gera em Equipe e acessos → Conectar aparelho.">
      <form action={formAction} className="space-y-4">
        <label htmlFor="codigo" className="block text-[12px] font-medium text-[var(--sub)]">
          Código
        </label>
        <input
          id="codigo"
          name="codigo"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="K7M4-9QPX"
          className="w-full min-h-14 px-4 rounded-lg outline-none border text-[22px] font-semibold tracking-[0.15em] text-center uppercase bg-[var(--panel)] text-[var(--tinta)] focus:ring-2 focus:ring-[var(--marca)]/20"
          style={{ borderColor: "var(--linha-forte)" }}
        />
        {estado.erro && (
          <p role="alert" className="text-[13px] rounded-lg px-3 py-2.5" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {estado.erro}
          </p>
        )}
        <button
          type="submit"
          disabled={pendente}
          className="w-full min-h-12 rounded-lg text-[15px] font-semibold disabled:opacity-60"
          style={{ background: "var(--tinta)", color: "var(--panel)" }}
        >
          {pendente ? "Conectando..." : "Conectar"}
        </button>
        <p className="text-[12px] text-[var(--tinta-faint)]">
          Depois de conectado, este aparelho abre direto no modo cozinha: checklists, temperaturas, produção, fichas e contagem. Nada de custo
          ou faturamento.
        </p>
      </form>
    </CartaoAuth>
  );
}
