"use client";

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
          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md mb-3"
          style={{
            background: "var(--gradient-accent)",
            color: "#FFFFFF",
          }}
        >
          <ChefHat size={26} />
        </div>
        <h2 className="text-[20px] font-bold tracking-tight text-[var(--text)]">Ficha Técnica</h2>
        <p className="text-[13px] text-[var(--sub)] mt-0.5">SaaS Gastronômico & Gestão de CMV</p>
      </div>

      <Card className="p-7 w-full shadow-lg border">
        <h1 className="text-[17px] font-bold mb-1 tracking-tight text-[var(--text)]">
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
                Senha (mínimo 6 caracteres)
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
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
                background: "var(--gradient-accent)",
                color: "#FFFFFF",
                opacity: pendente ? 0.7 : 1,
              }}
            >
              {pendente ? "Criando conta..." : "Criar Conta Gratuita"}
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
