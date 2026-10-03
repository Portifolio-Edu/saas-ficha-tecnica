"use client";

// LIGAÇÃO PRODUTO DO PDV -> FICHA (2026-10-03): a pendência visível. Lista os
// produtos vendidos que ainda não têm ficha (nem foram marcados "não tem
// ficha"), com o tamanho da pendência na última importação, e deixa ligar cada
// um na hora. Enquanto houver item aqui, o Fechamento de CMV avisa.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SEM_FICHA } from "@/lib/integracoes/conciliacao";
import type { ProdutoPdv } from "@/lib/dominio/produtoPdv";
import { acaoResolverProdutoPdv } from "@/app/integracoes/actions";
import { formatBRL, formatQtd } from "@/components/charts/format";

const campo = "text-[14px] px-3 min-h-10 rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function PendenciasPdv({ pendentes, fichas }: { pendentes: ProdutoPdv[]; fichas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (pendentes.length === 0) return null;

  const resolver = async (id: string, destino: string) => {
    if (!destino) return;
    setSalvando(id);
    setErro(null);
    const resposta = await acaoResolverProdutoPdv(id, destino);
    setSalvando(null);
    if (!resposta.ok) {
      setErro(resposta.erro);
      return;
    }
    router.refresh();
  };

  return (
    <section
      id="pendencias-pdv"
      aria-labelledby="titulo-pendencias-pdv"
      className="scroll-mt-20 rounded-xl border-2 overflow-hidden"
      style={{ borderColor: "color-mix(in srgb, var(--aviso) 55%, var(--linha))", background: "var(--panel)", boxShadow: "var(--shadow-card)" }}
    >
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--aviso)" }} aria-hidden />
        <div>
          <h3 id="titulo-pendencias-pdv" className="text-[16px] font-semibold text-[var(--tinta)]">
            {pendentes.length} {pendentes.length === 1 ? "produto vendido sem ficha" : "produtos vendidos sem ficha"}
          </h3>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-3xl">
            Esses produtos foram vendidos e não casam com nenhuma ficha, então ficam fora do CMV teórico e o gap do fechamento aparece maior do que é. Ligue cada um à ficha, ou marque &ldquo;não tem ficha&rdquo; se for bebida, taxa ou algo sem receita.
          </p>
        </div>
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
        {pendentes.map((p) => (
          <li key={p.id} className="px-5 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_300px] items-center gap-x-4 gap-y-2">
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[var(--tinta)] truncate">{p.descricao}</div>
              {p.codigo && <div className="text-[12px] text-[var(--tinta-faint)]">código {p.codigo}</div>}
            </div>
            <div className="text-[13px] text-[var(--tinta-sub)] md:text-right whitespace-nowrap">
              {p.ultimaQuantidade !== null ? `${formatQtd(p.ultimaQuantidade)} vendidos` : ""}
              {p.ultimoValor ? ` · ${formatBRL(p.ultimoValor)}` : ""}
              {p.ultimaVendaEm ? ` · até ${dataCurta(p.ultimaVendaEm)}` : ""}
            </div>
            <select
              value=""
              disabled={salvando === p.id}
              onChange={(e) => resolver(p.id, e.target.value)}
              className={`${campo} w-full min-h-[var(--alvo-toque)]`}
              style={{ borderColor: "var(--aviso)" }}
              aria-label={`Ficha de ${p.descricao}`}
            >
              <option value="">{salvando === p.id ? "Gravando..." : "Escolha a ficha"}</option>
              {fichas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
              <option value={SEM_FICHA}>Não tem ficha (bebida, sobremesa comprada, taxa)</option>
            </select>
          </li>
        ))}
      </ul>

      {erro && (
        <div role="alert" className="mx-5 my-3 text-[14px] rounded-lg px-4 py-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {erro}
        </div>
      )}
    </section>
  );
}
