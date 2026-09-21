"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

// Notificação de erro reutilizável (substitui window.alert). Estado fica num
// módulo só, sem Provider: qualquer client component chama useToast() pra
// disparar, e <ToastContainer /> (montado uma vez em AppShell/DemoShell)
// desenha a pilha. Auto-some depois de alguns segundos.
type Toast = { id: number; mensagem: string };

let proximoId = 1;
const SEM_TOASTS: Toast[] = [];
let toasts: Toast[] = SEM_TOASTS;
const ouvintes = new Set<() => void>();

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function adicionarToast(mensagem: string) {
  const id = proximoId++;
  toasts = [...toasts, { id, mensagem }];
  notificar();
  setTimeout(() => removerToast(id), 6000);
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
  return { mostrarErro: adicionarToast };
}

export function ToastContainer() {
  const lista = useSyncExternalStore(inscrever, () => toasts, () => SEM_TOASTS);
  if (lista.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(320px,calc(100vw-2rem))]">
      {lista.map((t) => (
        <div
          key={t.id}
          className="flex items-start gap-2 text-[12px] rounded-md px-2.5 py-2 shadow-lg"
          style={{ background: "var(--danger-soft)", color: "var(--danger)", boxShadow: "var(--shadow)" }}
        >
          <span className="flex-1">{t.mensagem}</span>
          <button
            onClick={() => removerToast(t.id)}
            aria-label="Fechar notificação"
            className="shrink-0"
            style={{ color: "var(--danger)" }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
