"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavegacaoEstoque({ pendentes = 0 }: { pendentes?: number }) {
  const caminho = usePathname() ?? "/estoque";
  const prefixo = caminho.startsWith("/preview") ? "/preview" : "";
  const compras = caminho.endsWith("/compras");
  return <nav aria-label="Seções de Estoque" className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: "var(--linha)" }}>
    {[{ nome: "Estoque", rota: "/estoque", ativo: !compras }, { nome: "Compras", rota: "/estoque/compras", ativo: compras }].map(item => <Link key={item.rota} href={`${prefixo}${item.rota}`} aria-label={item.nome} aria-current={item.ativo ? "page" : undefined} className="min-h-11 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-medium" style={{ background: item.ativo ? "var(--panel-hover)" : "transparent", color: item.ativo ? "var(--tinta)" : "var(--tinta-sub)" }}>
      {item.nome}{item.nome === "Compras" && pendentes > 0 && <span className="rounded-md px-1.5 text-xs bg-[var(--panel)]">{pendentes}<span className="sr-only"> aguardando aprovação</span></span>}
    </Link>)}
  </nav>;
}
