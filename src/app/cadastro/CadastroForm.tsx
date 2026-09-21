"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cadastrar, type EstadoAuth } from "@/lib/auth/actions";
import { Card } from "@/components/ficha/Card";
import { inputStyle } from "@/components/ficha/tema";

const estadoInicial: EstadoAuth = {};

export function CadastroForm() {
  const [estado, formAction, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <Card className="p-6 w-full max-w-md">
      <h1 className="text-[15px] font-semibold mb-1">Cadastre seu restaurante</h1>
      <p className="text-[12.5px] mb-5" style={{ color: "var(--sub)" }}>Leva menos de um minuto. Depois é só cadastrar insumo e receita pra ver o CMV de verdade.</p>

      {estado.sucesso ? (
        <div className="text-[12.5px] rounded-md px-3 py-3" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          {estado.sucesso}{" "}
          <Link href="/login" className="font-medium underline">Ir para o login</Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>Seu nome</div>
              <input id="nome" name="nome" required className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>Nome do restaurante</div>
              <input id="nome_restaurante" name="nome_restaurante" required className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>Telefone</div>
              <input id="telefone" name="telefone" required placeholder="(51) 99999-0000" className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>E-mail</div>
              <input id="email" name="email" type="email" required autoComplete="email" className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
            </div>
          </div>

          <div>
            <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>Senha</div>
            <input id="senha" name="senha" type="password" required minLength={6} autoComplete="new-password" className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
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
            style={{ background: "var(--accent)", color: "#fff", opacity: pendente ? 0.6 : 1 }}
          >
            {pendente ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      )}

      <div className="text-[12px] mt-4" style={{ color: "var(--sub)" }}>
        Já tem conta?{" "}
        <Link href="/login" className="font-medium" style={{ color: "var(--text)" }}>
          Entrar
        </Link>
      </div>
    </Card>
  );
}
