// LIGAÇÃO PRODUTO DO PDV -> FICHA (2026-10-03): aviso no Fechamento de CMV
// quando há produto vendido sem ficha. Só mostra se houver; o clique leva à
// lista em Integrações pra resolver. Componente de servidor, sem estado.
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ResumoPendencias } from "@/lib/dominio/produtoPdv";
import { formatBRL } from "@/components/charts/format";

export function AvisoPendenciasPdv({ resumo }: { resumo: ResumoPendencias }) {
  if (resumo.produtos === 0) return null;
  return (
    <div
      role="status"
      className="max-w-5xl mb-4 rounded-lg border px-4 py-3 text-[13px] flex flex-wrap items-center justify-between gap-3"
      style={{ borderColor: "var(--aviso)", background: "color-mix(in srgb, var(--aviso) 8%, var(--panel))", color: "var(--tinta-sub)" }}
    >
      <span className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--aviso)" }} aria-hidden />
        <span>
          <span className="font-medium text-[var(--tinta)]">
            {resumo.produtos} {resumo.produtos === 1 ? "produto vendido está sem ficha" : "produtos vendidos estão sem ficha"}
          </span>
          {resumo.valor > 0 ? ` (${formatBRL(resumo.valor)} na última importação)` : ""}. Eles ficam fora do CMV teórico, então o gap deste fechamento pode aparecer maior do que é.
        </span>
      </span>
      <Link href="/integracoes#pendencias-pdv" className="font-medium text-[var(--tinta)] underline underline-offset-2 min-h-10 flex items-center">
        Ligar às fichas
      </Link>
    </div>
  );
}
