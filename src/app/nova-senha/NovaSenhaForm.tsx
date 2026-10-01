"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { definirNovaSenha, type EstadoAuth } from "@/lib/auth/actions";
import { classeCampo } from "@/components/auth/CartaoAuth";

const inicial: EstadoAuth = {};

export function NovaSenhaForm() {
  const [estado, acao, pendente] = useActionState(definirNovaSenha, inicial);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="senha" className="block text-[13px] font-medium mb-1.5 text-[var(--sub)]">
          Senha nova (mínimo 8 caracteres)
        </label>
        <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className={classeCampo} style={{ borderColor: "var(--linha-forte)" }} />
      </div>
      <div>
        <label htmlFor="confirmacao" className="block text-[13px] font-medium mb-1.5 text-[var(--sub)]">
          Repita a senha nova
        </label>
        <input id="confirmacao" name="confirmacao" type="password" required minLength={8} autoComplete="new-password" className={classeCampo} style={{ borderColor: "var(--linha-forte)" }} />
      </div>
      {estado.erro && (
        <div role="alert" className="text-[13px] rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          {estado.erro}
        </div>
      )}
      <button type="submit" disabled={pendente} className="w-full text-[14px] font-semibold min-h-11 rounded-lg" style={{ background: "var(--tinta)", color: "var(--panel)", opacity: pendente ? 0.7 : 1 }}>
        {pendente ? "Salvando..." : "Salvar senha nova"}
      </button>
    </form>
  );
}
