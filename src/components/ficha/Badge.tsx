import type { ReactNode } from "react";

export function Badge({ children, acao = false }: { children: ReactNode; acao?: boolean }) {
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1"
      style={{ color: acao ? "var(--danger)" : "var(--sub)", background: acao ? "var(--danger-soft)" : "var(--bg)" }}
    >
      {children}
    </span>
  );
}
