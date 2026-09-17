"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar, type EstadoAuth } from "@/lib/auth/actions";
import { Card } from "@/components/ficha/Card";
import { inputStyle } from "@/components/ficha/tema";

const estadoInicial: EstadoAuth = {};

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial);

  return (
    <Card className="p-6 w-full max-w-sm">
      <h1 className="text-[15px] font-semibold mb-1">Entrar</h1>
      <p className="text-[12.5px] mb-5" style={{ color: "var(--sub)" }}>Ficha técnica, CMV e controle operacional do seu restaurante.</p>

      <form action={formAction} className="space-y-3">
        <div>
          <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>E-mail</div>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full"
            style={inputStyle}
          />
        </div>
        <div>
          <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>Senha</div>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            autoComplete="current-password"
            className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full"
            style={inputStyle}
          />
        </div>

        {estado.erro && (
          <div className="text-[12px] rounded-md px-2.5 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {estado.erro}
          </div>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="w-full text-[12.5px] font-medium px-3.5 py-2 rounded-lg"
          style={{ background: "var(--text)", color: "#fff", opacity: pendente ? 0.6 : 1 }}
        >
          {pendente ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="text-[12px] mt-4" style={{ color: "var(--sub)" }}>
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium" style={{ color: "var(--text)" }}>
          Cadastre seu restaurante
        </Link>
      </div>
    </Card>
  );
}
