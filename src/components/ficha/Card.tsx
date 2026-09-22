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
      className={`rounded-2xl transition-all duration-200 ${
        hover ? "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer" : ""
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
