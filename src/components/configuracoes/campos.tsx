import type { InputHTMLAttributes, ReactNode } from "react";
import { Card } from "@/components/ficha/Card";

// CONFIGURAÇÕES (2026-10-03): peças comuns das seções (título + descrição,
// campo com rótulo, botões). Rótulo em caixa normal, campo de 40px e botão
// primário de 44px, como no DESIGN.md.

export function SecaoConfig({ titulo, descricao, children, acao }: { titulo: string; descricao?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">{titulo}</h2>
          {descricao && <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-xl">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="border-t" style={{ borderColor: "var(--linha)" }}>
        {children}
      </div>
    </Card>
  );
}

export function Campo({ rotulo, ajuda, children, htmlFor }: { rotulo: string; ajuda?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[var(--tinta)] mb-1.5">
        {rotulo}
      </label>
      {children}
      {ajuda && <p className="text-[12px] text-[var(--tinta-faint)] mt-1.5">{ajuda}</p>}
    </div>
  );
}

export function CampoTexto({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full min-h-10 rounded-lg px-3 text-[14px] outline-none transition-colors border bg-[var(--panel)] border-[var(--linha-forte)] text-[var(--tinta)] placeholder:text-[var(--tinta-faint)] focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca-suave)] disabled:opacity-60 disabled:bg-[var(--panel-elevated)] ${className}`}
      {...props}
    />
  );
}

export function BotaoPrimario({ children, disabled, onClick, type = "button" }: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg text-[14px] font-medium transition-opacity disabled:opacity-60"
      style={{ background: "var(--tinta)", color: "var(--panel)" }}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, onClick, disabled, destrutivo = false, ariaLabel }: { children: ReactNode; onClick?: () => void; disabled?: boolean; destrutivo?: boolean; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 min-h-10 px-3.5 rounded-lg text-[13px] font-medium border transition-colors disabled:opacity-60 ${destrutivo ? "hover:bg-[var(--danger-soft)]" : "hover:bg-[var(--panel-hover)]"}`}
      style={{ borderColor: destrutivo ? "color-mix(in srgb, var(--danger) 40%, transparent)" : "var(--linha-forte)", color: destrutivo ? "var(--danger)" : "var(--tinta)" }}
    >
      {children}
    </button>
  );
}

export function MensagemErro({ erro }: { erro: string | null }) {
  if (!erro) return null;
  return (
    <div role="alert" className="text-[13px] rounded-lg px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
      {erro}
    </div>
  );
}
