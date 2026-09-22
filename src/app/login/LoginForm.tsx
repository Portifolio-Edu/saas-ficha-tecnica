"use client";

import { useActionState } from "react";
import Link from "next/link";
import { entrar, type EstadoAuth } from "@/lib/auth/actions";
import { Card } from "@/components/ficha/Card";
import { inputStyle } from "@/components/ficha/tema";

import { ChefHat, AlertCircle, ArrowRight } from "lucide-react";

const estadoInicial: EstadoAuth = {};

export function LoginForm() {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial);

  return (
    <div className="w-full max-w-sm flex flex-col items-center animate-slide-up">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center mb-3"
          style={{
            background: "var(--tinta)", // SISTEMA premium: antes var(--gradient-accent), que nunca existiu (botão e logo ficavam invisíveis)
            color: "var(--panel)",
          }}
        >
          <ChefHat size={26} />
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-[var(--text)]">Ficha Técnica</h2>
        <p className="text-[13px] text-[var(--sub)] mt-0.5">Custo, produção e CMV da sua cozinha</p>{/* SISTEMA premium: antes "SaaS Gastronômico & Gestão de CMV" */}
      </div>

      <Card className="p-7 w-full shadow-lg border">
        <h1 className="text-[17px] font-bold mb-1 tracking-tight text-[var(--text)]">Acessar conta</h1>
        <p className="text-[13px] mb-5 text-[var(--sub)]">
          Entre com seus dados para acessar o painel do seu restaurante.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[12px] font-medium mb-1.5 text-[var(--sub)]">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@restaurante.com"
              className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              style={inputStyle}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="senha" className="text-[12px] font-medium text-[var(--sub)]">
                Senha
              </label>
            </div>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
              style={inputStyle}
            />
          </div>

          {estado.erro && (
            <div
              className="text-[12.5px] rounded-lg px-3 py-2.5 flex items-start gap-2 animate-fade-in"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{estado.erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pendente}
            className="w-full text-[13.5px] font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              background: "var(--tinta)", // SISTEMA premium: antes var(--gradient-accent), que nunca existiu (botão e logo ficavam invisíveis)
              color: "var(--panel)",
              opacity: pendente ? 0.7 : 1,
            }}
          >
            {pendente ? "Entrando..." : "Entrar" /* SISTEMA premium: antes "Entrar na Conta" (caixa de frase, DESIGN.md) */}
            {!pendente && <ArrowRight size={15} />}
          </button>
        </form>

        <div className="text-[12.5px] mt-5 pt-4 border-t text-center text-[var(--sub)]" style={{ borderColor: "var(--border)" }}>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-[var(--accent)] hover:underline">
            Cadastre seu restaurante
          </Link>
        </div>
      </Card>

      <div className="mt-4 text-center">
        <Link
          href="/preview"
          className="text-[12px] text-[var(--faint)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
        >
          Acessar modo de demonstração interativo →
        </Link>
      </div>
    </div>
  );
}
