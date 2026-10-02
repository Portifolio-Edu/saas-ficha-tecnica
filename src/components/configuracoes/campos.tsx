"use client";

// CONFIGURAÇÕES (2026-10-01): peças dos formulários da tela Configurações —
// bloco com título e rodapé de ação, campo com rótulo/ajuda/erro ligados por
// aria e o aviso (toast) de cada gravação. Tudo controlado: o React 19 limpa
// formulário não controlado depois da ação, e quem errou um campo perderia o
// que digitou.

import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Card } from "@/components/ficha/Card";
import { useToast } from "@/components/ficha/Toast";
import type { EstadoForm } from "@/app/configuracoes/actions";

export function Bloco({
  titulo,
  descricao,
  children,
  rodape,
  perigo = false,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  /** Barra de baixo com a ação principal (Salvar). */
  rodape?: ReactNode;
  perigo?: boolean;
}) {
  const id = useId();
  return (
    <Card className="overflow-hidden" style={perigo ? { borderColor: "color-mix(in srgb, var(--danger) 35%, transparent)" } : undefined}>
      <section aria-labelledby={id}>
        <div className="p-5">
          <h2 id={id} className="text-[14px] font-semibold text-[var(--tinta)]" style={perigo ? { color: "var(--danger)" } : undefined}>
            {titulo}
          </h2>
          {descricao && <p className="text-[13px] mt-1 text-[var(--tinta-sub)] max-w-prose">{descricao}</p>}
          <div className="mt-4">{children}</div>
        </div>
        {rodape && (
          <div className="px-5 py-3 border-t flex flex-wrap items-center justify-end gap-3" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
            {rodape}
          </div>
        )}
      </section>
    </Card>
  );
}

const estiloCampo =
  "w-full min-h-10 rounded-lg px-3 text-[14px] bg-[var(--panel)] text-[var(--tinta)] border outline-none transition-colors placeholder:text-[var(--tinta-faint)] focus:border-[var(--marca)] focus:ring-2 focus:ring-[var(--marca-suave)] disabled:opacity-60 disabled:cursor-not-allowed";

export function Campo({
  rotulo,
  ajuda,
  erro,
  className = "",
  ...input
}: { rotulo: string; ajuda?: ReactNode; erro?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium mb-1.5 text-[var(--tinta)]">
        {rotulo}
        {!input.required && <span className="font-normal text-[var(--tinta-faint)]"> (opcional)</span>}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={[erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(" ") || undefined}
        className={estiloCampo}
        style={{ borderColor: erro ? "var(--danger)" : "var(--linha-forte)" }}
        {...input}
      />
      {erro && (
        <p id={idErro} className="text-[12.5px] mt-1.5" style={{ color: "var(--danger)" }}>
          {erro}
        </p>
      )}
      {ajuda && !erro && (
        <p id={idAjuda} className="text-[12.5px] mt-1.5 text-[var(--tinta-faint)]">
          {ajuda}
        </p>
      )}
    </div>
  );
}

export function Selecao({
  rotulo,
  erro,
  opcoes,
  className = "",
  ...select
}: {
  rotulo: string;
  erro?: string;
  opcoes: { valor: string; rotulo: string }[];
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-medium mb-1.5 text-[var(--tinta)]">
        {rotulo}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={estiloCampo}
        style={{ borderColor: erro ? "var(--danger)" : "var(--linha-forte)" }}
        {...select}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro && (
        <p id={`${id}-erro`} className="text-[12.5px] mt-1.5" style={{ color: "var(--danger)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}

export function BotaoPrimario({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg text-[13.5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ background: "var(--tinta)", color: "var(--panel)" }}
      {...props}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 min-h-10 px-3.5 rounded-lg border text-[13.5px] font-medium text-[var(--tinta)] bg-[var(--panel)] hover:bg-[var(--panel-hover)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ borderColor: "var(--linha-forte)" }}
      {...props}
    >
      {children}
    </button>
  );
}

/** Mostra o aviso de cada gravação uma vez (sucesso) e o erro geral, se houver. */
export function useAvisoDaAcao(estado: EstadoForm, aoSalvar?: () => void) {
  const { mostrarSucesso, mostrarErro } = useToast();
  const ultimo = useRef<EstadoForm | null>(null);
  useEffect(() => {
    if (ultimo.current === estado) return;
    ultimo.current = estado;
    if (estado.ok && estado.sucesso) {
      mostrarSucesso(estado.sucesso);
      aoSalvar?.();
    } else if (estado.erro) {
      mostrarErro(estado.erro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
}

/** "Alterações não salvas" + Salvar; o botão só acende quando algo mudou. */
export function RodapeSalvar({ alterado, pendente, rotulo = "Salvar" }: { alterado: boolean; pendente: boolean; rotulo?: string }) {
  return (
    <>
      <span className="text-[12.5px] text-[var(--tinta-faint)] mr-auto" aria-live="polite">
        {alterado && !pendente ? "Alterações não salvas" : ""}
      </span>
      <BotaoPrimario type="submit" disabled={!alterado || pendente}>
        {pendente ? "Salvando…" : rotulo}
      </BotaoPrimario>
    </>
  );
}

/** Liga/desliga acessível: checkbox nativo (teclado, leitor de tela e formulário) com cara de chave. */
export function Interruptor({
  nome,
  rotulo,
  descricao,
  ligado,
  aoMudar,
}: {
  nome: string;
  rotulo: string;
  descricao?: ReactNode;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[14px] font-medium text-[var(--tinta)] cursor-pointer">
          {rotulo}
        </label>
        {descricao && (
          <p id={`${id}-desc`} className="text-[12.5px] text-[var(--tinta-faint)] mt-0.5">
            {descricao}
          </p>
        )}
      </div>
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input
          id={id}
          name={nome}
          type="checkbox"
          role="switch"
          checked={ligado}
          onChange={(e) => aoMudar(e.target.checked)}
          aria-describedby={descricao ? `${id}-desc` : undefined}
          className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
        />
        <span
          aria-hidden
          className="pointer-events-none w-11 h-6 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--marca)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--panel)]"
          style={{ background: ligado ? "var(--marca)" : "var(--linha-forte)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform motion-reduce:transition-none"
          style={{ background: "var(--panel)", transform: ligado ? "translateX(20px)" : "none", boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
        />
      </span>
    </div>
  );
}
