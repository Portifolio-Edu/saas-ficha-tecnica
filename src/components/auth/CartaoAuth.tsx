import type { ReactNode } from "react";
import { ChefHat } from "lucide-react";
import { Card } from "@/components/ficha/Card";

// PRODUCAO (2026-09-24): moldura comum das telas de conta (recuperar senha,
// nova senha), no mesmo desenho do login e do cadastro.
export function CartaoAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <main id="conteudo" className="w-full min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <ChefHat size={26} />
          </div>
          <div className="text-[22px] font-semibold tracking-tight text-[var(--text)]">Ficha Técnica</div>
        </div>
        <Card className="p-7 w-full border">
          <h1 className="text-[16px] font-semibold mb-1 tracking-tight text-[var(--text)]">{titulo}</h1>
          {subtitulo && <p className="text-[13px] mb-5 text-[var(--sub)]">{subtitulo}</p>}
          {children}
        </Card>
      </div>
    </main>
  );
}

export const classeCampo =
  "w-full text-[14px] px-3 min-h-11 rounded-lg outline-none border bg-[var(--panel)] text-[var(--tinta)] focus:ring-2 focus:ring-[var(--marca)]/20";
