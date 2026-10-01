import type { CSSProperties, ReactNode } from "react";
import { shadow } from "./tema";

export function Card({
  children,
  className = "",
  style = {},
  hover = false,
  animate = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hover?: boolean;
  animate?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      // SISTEMA premium: canto de 12px (antes rounded-2xl, 16px) e hover só com borda
      // mais forte (antes subia 2px com sombra grande -- gesto de landing page).
      className={`rounded-xl transition-colors duration-150 ${
        hover ? "hover:border-[var(--linha-forte)] cursor-pointer" : ""
      } ${animate ? "animate-fade-in" : ""} ${className}`}
      style={{
        backgroundColor: "var(--panel)",
        boxShadow: shadow,
        border: "var(--card-border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
