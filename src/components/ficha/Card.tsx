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
      className={`rounded-2xl ${className}`}
      style={{ backgroundColor: "var(--panel)", boxShadow: shadow, ...style }}
    >
      {children}
    </div>
  );
}
