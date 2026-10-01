"use client";

// SISTEMA premium (escala do DESIGN.md): nome 20px bold virou 22px semibold; título do cartão 17px bold virou 16px semibold. Reverter: git revert do commit "polimento(sistema): tamanhos e cores na escala".

import { useActionState } from "react";
import Link from "next/link";
import { cadastrar, type EstadoAuth } from "@/lib/auth/actions";
import { Card } from "@/components/ficha/Card";
import { inputStyle } from "@/components/ficha/tema";

import { ChefHat, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

const estadoInicial: EstadoAuth = {};

export function CadastroForm() {
  const [estado, formAction, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <div className="w-full max-w-md flex flex-col items-center animate-slide-up">
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
        <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">Ficha Técnica</h2>
        <p className="text-[13px] text-[var(--sub)] mt-0.5">Custo, produção e CMV da sua cozinha</p>{/* SISTEMA premium: antes "SaaS Gastronômico & Gestão de CMV" */}
      </div>

      <Card className="p-7 w-full shadow-lg border">
        <h1 className="text-[16px] font-semibold mb-1 tracking-tight text-[var(--text)]">
          Cadastre seu restaurante
        </h1>
        <p className="text-[13px] mb-5 text-[var(--sub)]">
          Leva menos de um minuto. Depois é só cadastrar insumo e receita pra ver o CMV de verdade.
        </p>

        {estado.sucesso ? (
          <div
            className="text-[13px] rounded-xl p-4 flex items-start gap-3 animate-fade-in border"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderColor: "var(--border)",
            }}
          >
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">{estado.sucesso}</div>
              <Link href="/login" className="font-medium underline mt-1 inline-block">
                Ir para o login agora →
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nome" className="block text-[11.5px] font-medium mb-1 text-[var(--sub)]">
                  Seu nome
                </label>
                <input
                  id="nome"
                  name="nome"
                  required
                  placeholder="Carlos Silva"
                  className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="nome_restaurante" className="block text-[11.5px] font-medium mb-1 text-[var(--sub)]">
                  Nome do restaurante
                </label>
                <input
                  id="nome_restaurante"
                  name="nome_restaurante"
                  required
                  placeholder="Bistrô do Chef"
                  className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="telefone" className="block text-[11.5px] font-medium mb-1 text-[var(--sub)]">
                  WhatsApp / Telefone
                </label>
                <input
                  id="telefone"
                  name="telefone"
                  required
                  placeholder="(11) 99999-0000"
                  className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-[11.5px] font-medium mb-1 text-[var(--sub)]">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="carlos@bistro.com"
                  className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-[11.5px] font-medium mb-1 text-[var(--sub)]">
                Senha (mínimo 8 caracteres)
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full text-[13px] px-3 py-2 rounded-lg outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                style={inputStyle}
              />
            </div>

            {/* PRODUCAO (2026-09-24): aceite obrigatório dos termos (LGPD). O servidor
                confere de novo e grava data e versão do aceite no cadastro. */}
            <label className="flex items-start gap-2.5 text-[12.5px] text-[var(--sub)] cursor-pointer">
              <input type="checkbox" name="aceite_termos" required className="mt-0.5 w-4 h-4 shrink-0" style={{ accentColor: "var(--tinta)" }} />
              <span>
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="font-medium text-[var(--tinta)] underline underline-offset-2">
                  Termos de uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" target="_blank" className="font-medium text-[var(--tinta)] underline underline-offset-2">
                  Política de privacidade
                </Link>
                .
              </span>
            </label>

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
              {pendente ? "Criando conta..." : "Criar conta gratuita" /* SISTEMA premium: antes "Criar Conta Gratuita" */}
              {!pendente && <ArrowRight size={15} />}
            </button>
          </form>
        )}

        <div className="text-[12.5px] mt-5 pt-4 border-t text-center text-[var(--sub)]" style={{ borderColor: "var(--border)" }}>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
            Entrar
          </Link>
        </div>
      </Card>
    </div>
  );
}
