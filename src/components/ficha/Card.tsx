import type { CSSProperties, ReactNode } from "react";
import { shadow } from "./tema";

export function Card({
  children,
  className = "",
  style = {},
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{ backgroundColor: "var(--panel)", border: `1px solid ${"var(--border)"}`, boxShadow: shadow, ...style }}
    >
      {children}
    </div>
  );
}
