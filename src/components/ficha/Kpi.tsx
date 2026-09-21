import type { ReactNode } from "react";
import { Card } from "./Card";
import { nums } from "./tema";

export function Kpi({ label, value, alerta, sub }: { label: string; value: ReactNode; alerta?: boolean; sub?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-[13px]" style={{ color: "var(--sub)" }}>{label}</div>
      <div
        className={`text-[38px] font-bold mt-1.5 leading-none ${alerta ? "" : "texto-brasa"}`}
        style={{ ...nums, color: alerta ? "var(--danger)" : undefined, letterSpacing: "-0.025em" }}
      >
        {value}
      </div>
      {sub && <div className="text-[12px] mt-2" style={{ color: "var(--faint)" }}>{sub}</div>}
    </Card>
  );
}
