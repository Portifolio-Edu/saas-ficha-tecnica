import type { CSSProperties, ReactNode } from "react";
import { C, shadow } from "./tema";

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
      style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, boxShadow: shadow, ...style }}
    >
      {children}
    </div>
  );
}
