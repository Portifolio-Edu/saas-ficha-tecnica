"use client";

import { useSyncExternalStore } from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";

type TipoToast = "erro" | "sucesso" | "info";
type Toast = { id: number; mensagem: string; tipo: TipoToast };

let proximoId = 1;
const SEM_TOASTS: Toast[] = [];
let toasts: Toast[] = SEM_TOASTS;
const ouvintes = new Set<() => void>();

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function adicionarToast(mensagem: string, tipo: TipoToast = "erro") {
  const id = proximoId++;
  toasts = [...toasts, { id, mensagem, tipo }];
  notificar();
  setTimeout(() => removerToast(id), 5000);
}

function removerToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notificar();
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function useToast() {
  return {
    mostrarErro: (msg: string) => adicionarToast(msg, "erro"),
    mostrarSucesso: (msg: string) => adicionarToast(msg, "sucesso"),
    mostrarInfo: (msg: string) => adicionarToast(msg, "info"),
  };
}

export function ToastContainer() {
  const lista = useSyncExternalStore(inscrever, () => toasts, () => SEM_TOASTS);
  if (lista.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[min(360px,calc(100vw-2.5rem))]">
      {lista.map((t) => {
        const isSuccess = t.tipo === "sucesso";
        const isInfo = t.tipo === "info";
        const isError = t.tipo === "erro";

        const bg = isSuccess
          ? "var(--accent-soft)"
          : isInfo
          ? "var(--status-estoque-soft)"
          : "var(--danger-soft)";

        const color = isSuccess
          ? "var(--accent)"
          : isInfo
          ? "var(--status-estoque)"
          : "var(--danger)";

        return (
          <div
            key={t.id}
            className="flex items-start gap-2.5 text-[13px] rounded-xl px-3.5 py-3 shadow-xl animate-slide-up border transition-all"
            style={{
              backgroundColor: "var(--panel)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-lift)",
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: bg, color }}
            >
              {isSuccess && <CheckCircle2 size={13} />}
              {isInfo && <Info size={13} />}
              {isError && <AlertCircle size={13} />}
            </div>
            <span className="flex-1 font-medium leading-snug" style={{ color: "var(--text)" }}>
              {t.mensagem}
            </span>
            <button
              onClick={() => removerToast(t.id)}
              aria-label="Fechar notificação"
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded"
              style={{ color: "var(--sub)" }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
