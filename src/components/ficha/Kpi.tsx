import type { ReactNode } from "react";
import { Card } from "./Card";
import { nums } from "./tema";

/**
 * flat: painel raso (fundo var(--panel), sem Card/sombra) em vez de card
 * elevado -- pra KPI de resumo não competir em hierarquia com o card de
 * conteúdo principal da tela (auditoria avoid-ai-design, achado K2).
 */
export function Kpi({ label, value, alerta, sub, flat }: { label: string; value: ReactNode; alerta?: boolean; sub?: ReactNode; flat?: boolean }) {
  const conteudo = (
    <>
      <div className="text-[13px]" style={{ color: "var(--sub)" }}>{label}</div>
      <div
        className="text-[32px] font-bold mt-1.5 leading-none whitespace-nowrap"
        style={{ ...nums, color: alerta ? "var(--danger)" : "var(--marca)", letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
      {sub && <div className="text-[12px] mt-2" style={{ color: "var(--faint)" }}>{sub}</div>}
    </>
  );
  if (flat) {
    return <div className="rounded-lg p-5" style={{ background: "var(--panel)" }}>{conteudo}</div>;
  }
  return <Card className="p-5">{conteudo}</Card>;
}
