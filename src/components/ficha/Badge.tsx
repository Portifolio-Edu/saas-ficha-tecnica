import type { ReactNode } from "react";

export type BadgeVariant = "padrao" | "acao" | "sucesso" | "aviso" | "info";

export function Badge({
  children,
  acao = false,
  variante = acao ? "acao" : "padrao",
  comPonto = false,
  className = "",
}: {
  children: ReactNode;
  acao?: boolean;
  variante?: BadgeVariant;
  comPonto?: boolean;
  className?: string;
}) {
  const styles: Record<BadgeVariant, { color: string; bg: string; dot: string; border: string }> = {
    padrao: {
      color: "var(--sub)",
      bg: "var(--bg)",
      dot: "var(--faint)",
      border: "var(--border)",
    },
    acao: {
      color: "var(--danger)",
      bg: "var(--danger-soft)",
      dot: "var(--danger)",
      border: "transparent",
    },
    sucesso: {
      color: "var(--accent)",
      bg: "var(--accent-soft)",
      dot: "var(--accent)",
      border: "transparent",
    },
    aviso: {
      color: "var(--status-producao)",
      bg: "var(--status-producao-soft)",
      dot: "var(--status-producao)",
      border: "transparent",
    },
    info: {
      color: "var(--status-estoque)",
      bg: "var(--status-estoque-soft)",
      dot: "var(--status-estoque)",
      border: "transparent",
    },
  };

  const st = styles[variante] || styles.padrao;

  return (
    <span
      className={`text-[11.5px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 transition-colors border ${className}`}
      style={{
        color: st.color,
        backgroundColor: st.bg,
        borderColor: st.border,
      }}
    >
      {comPonto && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: st.dot }}
        />
      )}
      {children}
    </span>
  );
}
