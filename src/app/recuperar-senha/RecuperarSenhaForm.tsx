"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { recuperarSenha, type EstadoAuth } from "@/lib/auth/actions";
import { classeCampo } from "@/components/auth/CartaoAuth";

const inicial: EstadoAuth = {};

export function RecuperarSenhaForm() {
  const [estado, acao, pendente] = useActionState(recuperarSenha, inicial);
  if (estado.sucesso) {
    return (
      <div className="space-y-4">
        <div className="text-[14px] rounded-lg p-4 flex items-start gap-3" style={{ background: "color-mix(in srgb, var(--sucesso) 10%, transparent)", color: "var(--tinta)" }}>
          <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: "var(--sucesso)" }} />
          {estado.sucesso}
        </div>
        <Link href="/login" className="block text-center text-[14px] font-medium min-h-11 leading-[44px] rounded-lg border" style={{ borderColor: "var(--linha-forte)" }}>
          Voltar pro login
        </Link>
      </div>
    );
  }
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-[13px] font-medium mb-1.5 text-[var(--sub)]">
          E-mail da conta
        </label>
        {/* PLANO 9,5 (2026-09-28): texto, não "email": quem digita o usuário
            (gestor/estoquista) recebe a orientação do servidor em vez da
            bolha genérica do navegador. */}
        <input id="email" name="email" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} required autoComplete="email" className={classeCampo} style={{ borderColor: "var(--linha-forte)" }} />
      </div>
      {estado.erro && (
        <div role="alert" className="text-[13px] rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {estado.erro}
        </div>
      )}
      <button type="submit" disabled={pendente} className="w-full text-[14px] font-semibold min-h-11 rounded-lg" style={{ background: "var(--tinta)", color: "var(--panel)", opacity: pendente ? 0.7 : 1 }}>
        {pendente ? "Enviando..." : "Enviar link"}
      </button>
      <Link href="/login" className="block text-center text-[13px] text-[var(--sub)] hover:text-[var(--tinta)] min-h-10 leading-10">
        Lembrei a senha
      </Link>
    </form>
  );
}
