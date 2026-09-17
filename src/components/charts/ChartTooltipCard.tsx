import type { ReactNode } from "react";
import { C, nums, shadow } from "@/components/ficha/tema";

export interface LinhaTooltip {
  rotulo: string;
  valor: string;
  cor?: string;
  destaque?: boolean;
}

/**
 * Card de tooltip elevado (sombra + borda), com tipografia hierarquizada:
 * titulo em destaque, rotulo em cor secundaria, valor em peso maior. Todo
 * grafico do sistema monta suas linhas e passa aqui, em vez de cada um
 * desenhar seu proprio balao de tooltip.
 */
export function ChartTooltipCard({ titulo, linhas, rodape }: { titulo: string; linhas: LinhaTooltip[]; rodape?: ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2.5 min-w-[160px]" style={{ background: C.panel, border: `1px solid ${C.border}`, boxShadow: `${shadow}, 0 8px 24px rgba(13,13,15,0.12)` }}>
      <div className="text-[12px] font-semibold mb-1.5" style={{ color: C.text }}>{titulo}</div>
      <div className="space-y-1">
        {linhas.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            {l.cor && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: l.cor }} />}
            <span className="flex-1" style={{ color: C.sub }}>{l.rotulo}</span>
            <span className="font-semibold" style={{ ...nums, color: l.destaque ? C.danger : C.text }}>{l.valor}</span>
          </div>
        ))}
      </div>
      {rodape && (
        <div className="text-[10.5px] mt-1.5 pt-1.5" style={{ color: C.faint, borderTop: `1px solid ${C.border}` }}>
          {rodape}
        </div>
      )}
    </div>
  );
}
