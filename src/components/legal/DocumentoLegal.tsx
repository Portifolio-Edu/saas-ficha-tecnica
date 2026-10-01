import type { ReactNode } from "react";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { VERSAO_TERMOS } from "@/lib/auth/termos";

// PRODUCAO (2026-09-24): moldura das páginas públicas de Termos e Privacidade.
export function DocumentoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  const [a, m, d] = VERSAO_TERMOS.split("-");
  return (
    <main id="conteudo" className="w-full min-h-screen" style={{ background: "var(--bg)", color: "var(--tinta)" }}>
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold mb-8">
          <span className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <ChefHat size={18} />
          </span>
          Ficha Técnica
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight">{titulo}</h1>
        <p className="text-[13px] text-[var(--tinta-faint)] mt-1">Versão de {`${d}/${m}/${a}`}</p>
        <article className="legal mt-8 space-y-5 text-[15px] leading-relaxed text-[var(--tinta-sub)]">{children}</article>
        <div className="mt-12 pt-6 border-t text-[13px] flex gap-4" style={{ borderColor: "var(--linha)" }}>
          <Link href="/termos" className="hover:text-[var(--tinta)]">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-[var(--tinta)]">Política de privacidade</Link>
          <Link href="/login" className="hover:text-[var(--tinta)]">Entrar</Link>
        </div>
      </div>
    </main>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-semibold text-[var(--tinta)] pt-3">{titulo}</h2>
      {children}
    </section>
  );
}
