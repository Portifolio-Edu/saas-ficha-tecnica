import type { CSSProperties } from "react";
import { Card } from "./Card";

export function Skeleton({
  className = "",
  style = {},
  width,
  height,
  rounded = "rounded-lg",
}: {
  className?: string;
  style?: CSSProperties;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) {
  return (
    <div
      className={`shimmer ${rounded} ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="p-5 rounded-2xl border space-y-3"
      style={{
        backgroundColor: "var(--panel)",
        borderColor: "var(--border)",
      }}
    >
      <Skeleton width="40%" height="14px" />
      <Skeleton width="70%" height="28px" />
      <Skeleton width="55%" height="12px" />
    </div>
  );
}

// DESEMPENHO (2026-10-03): o que aparece enquanto o código de uma tela chega
// (import dinâmico em src/app/preview/PorPapelDemo.tsx e nas páginas do app).
// Antes a área ficava vazia: /preview/cmv baixa ~140 KB (gráficos) no clique e
// levava 1s em branco num celular médio. Três indicadores + um bloco grande,
// o desenho comum das telas do painel.
export function EsqueletoTela() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando…</span>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-5 space-y-3">
            <Skeleton width="40%" height="12px" />
            <Skeleton width="65%" height="24px" />
          </Card>
        ))}
      </div>
      <Card className="p-5 space-y-3">
        <Skeleton width="30%" height="14px" />
        <Skeleton height="220px" />
      </Card>
    </div>
  );
}
