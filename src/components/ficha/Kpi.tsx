import type { ReactNode } from "react";
import { Card } from "./Card";
import { C, nums } from "./tema";

export function Kpi({ label, value, alerta, sub }: { label: string; value: ReactNode; alerta?: boolean; sub?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-[13px]" style={{ color: C.sub }}>{label}</div>
      <div className="text-[30px] font-bold mt-1.5 leading-none" style={{ ...nums, color: alerta ? C.danger : C.text, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div className="text-[12px] mt-2" style={{ color: C.faint }}>{sub}</div>}
    </Card>
  );
}
