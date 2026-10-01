import type { ReactNode } from "react";
import { Card } from "./Card";
import { nums } from "./tema";

export function Kpi({
  label,
  value,
  alerta,
  sub,
  icon,
  trend,
}: {
  label: string;
  value: ReactNode;
  alerta?: boolean;
  sub?: ReactNode;
  icon?: ReactNode;
  trend?: { value: string | number; isPositive?: boolean };
}) {
  return (
    <Card className="p-5 flex flex-col justify-between" animate>
      <div>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium" style={{ color: "var(--sub)" }}>{label}</div>
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{
                background: alerta ? "var(--danger-soft)" : "var(--accent-soft)",
                color: alerta ? "var(--danger)" : "var(--accent)",
              }}
            >
              {icon}
            </div>
          )}
        </div>
        <div
          // SISTEMA premium: 28px peso 600 (antes 32px bold), como os números do painel Stripe.
          className="text-[28px] font-semibold mt-2 leading-none tracking-tight"
          style={{
            ...nums,
            color: alerta ? "var(--danger)" : "var(--text)",
          }}
        >
          {value}
        </div>
      </div>
      {(sub || trend) && (
        <div className="text-[12px] mt-3 flex items-center gap-1.5" style={{ color: "var(--faint)" }}>
          {trend && (
            <span
              className="inline-flex items-center font-semibold px-1.5 py-0.5 rounded text-[11px]"
              style={{
                // SISTEMA premium: alta em verde (antes tinta sobre cinza, sem cor de "bom").
                backgroundColor: trend.isPositive ? "color-mix(in srgb, var(--sucesso) 10%, transparent)" : "var(--danger-soft)",
                color: trend.isPositive ? "var(--sucesso)" : "var(--danger)",
              }}
            >
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </Card>
  );
}
