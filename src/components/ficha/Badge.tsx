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
    // SISTEMA premium: "sucesso" era tinta sobre cinza (não parecia sucesso); agora verde.
    sucesso: {
      color: "var(--sucesso)",
      bg: "color-mix(in srgb, var(--sucesso) 10%, transparent)",
      dot: "var(--sucesso)",
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
      // SISTEMA premium: retângulo de canto 6px e 12px, no padrão Stripe (antes pílula de 11,5px).
      className={`text-[12px] font-medium px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap transition-colors border ${className}`}
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
