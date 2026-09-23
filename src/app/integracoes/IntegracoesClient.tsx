"use client";

// INTEGRACOES (2026-09-23) -- tela nova, pedido do usuário: integrar com os PDVs
// do mercado e com o iFood, e ter uma alternativa quando o PDV não libera
// integração. Posição de venda: o Ficha Técnica soma ao PDV, não substitui.
//
// O que é real e o que é simulado:
//  - Importação de XML fiscal e de planilha: REAL (components/integracoes).
//  - Conexão com PDV/iFood: NÃO EXISTE ainda. No app aparece "Em breve"; na demo
//    (/preview) iFood e Saipos aparecem conectados, com pedidos chegando, sempre
//    com o selo "demo" (escolha do usuário em 2026-09-23). Os outros PDVs, na
//    demo, "conectam" com um toque, também simulado.
// Pra tirar a tela: apagar src/app/integracoes, src/app/preview/integracoes, o
// item "Integrações" em ShellPremium.tsx e em preview/page.tsx.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Plug } from "lucide-react";
import { CANAIS, GRUPOS_CANAL, type PedidoRecebido } from "@/lib/integracoes/pdvs";
import { ImportadorVendas } from "@/components/integracoes/ImportadorVendas";
import { formatBRL } from "@/components/charts/format";

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;

function SeloDemo() {
  return (
    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
      demo
    </span>
  );
}

function hora(iso: string): string {
  // Fuso fixo: servidor e navegador precisam mostrar a mesma hora (senão o React acusa diferença na hidratação).
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function IntegracoesClient({
  fichas,
  demo,
}: {
  fichas: { id: string; nome: string }[];
  /** Só na /preview: canais simulados como conectados e pedidos chegando. */
  demo?: {
    conectados: string[];
    pedidos: PedidoRecebido[];
    resumoHoje: Record<string, { pedidos: number; valor: number }>;
    notasExemplo: () => { nome: string; conteudo: string }[];
  };
}) {
  const basePath = usePathname()?.startsWith("/preview") ? "/preview" : "";
  const [conectados, setConectados] = useState<string[]>(demo?.conectados ?? []);
  const nomeCanal = (id: string) => CANAIS.find((c) => c.id === id)?.nome ?? id;
  const totalHoje = demo ? Object.entries(demo.resumoHoje).filter(([id]) => conectados.includes(id)) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">Integrações</h2>
        <p className="text-[14px] text-[var(--tinta-sub)] mt-1 max-w-3xl">
          O Ficha Técnica não troca o sistema do caixa: ele puxa as vendas do PDV e do delivery pra calcular o CMV real e mostrar onde a margem está vazando.
        </p>
      </div>

      {/* Vendas entrando (só na demo, simulado). */}
      {demo && conectados.length > 0 && (
        <section aria-labelledby="titulo-entrando" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 id="titulo-entrando" className="text-[16px] font-semibold text-[var(--tinta)]">
                Vendas entrando agora
              </h3>
              <SeloDemo />
            </div>
            <span className="text-[13px] text-[var(--tinta-faint)]">
              Hoje: {totalHoje.reduce((s, [, v]) => s + v.pedidos, 0)} pedidos · {formatBRL(totalHoje.reduce((s, [, v]) => s + v.valor, 0))}
            </span>
          </div>
          <div className="rounded-xl border overflow-hidden" style={painel}>
            <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
              {demo.pedidos
                .filter((p) => conectados.includes(p.canalId))
                .map((p) => (
                  <li key={p.id} className="px-5 py-3 grid grid-cols-[56px_minmax(0,1fr)_auto] md:grid-cols-[56px_120px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5">
                    <span className="text-[13px] text-[var(--tinta-faint)]">{hora(p.recebidoEm)}</span>
                    <span className="text-[13px] font-medium text-[var(--tinta-sub)] hidden md:block">{nomeCanal(p.canalId)}</span>
                    <span className="text-[14px] text-[var(--tinta)] min-w-0 truncate">
                      <span className="md:hidden text-[var(--tinta-sub)]">{nomeCanal(p.canalId)} · </span>
                      {p.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}
                    </span>
                    <span className="text-[14px] font-medium text-right whitespace-nowrap">{formatBRL(p.valor)}</span>
                  </li>
                ))}
            </ul>
            <div className="px-5 py-3 border-t text-[13px] text-[var(--tinta-faint)]" style={{ borderColor: "var(--linha)" }}>
              Cada pedido baixa a ficha dos pratos e entra no CMV do período, sem esperar o fechamento.
            </div>
          </div>
        </section>
      )}

      {/* Canais: iFood e PDVs. */}
      <section aria-labelledby="titulo-canais" className="space-y-5">
        <div>
          <h3 id="titulo-canais" className="text-[16px] font-semibold text-[var(--tinta)]">
            Delivery e PDV
          </h3>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            {demo
              ? "Na demonstração, a conexão é simulada. No sistema, cada PDV pede o token de integração que ele fornece."
              : "As conexões diretas estão em desenvolvimento. Enquanto isso, qualquer PDV funciona pela importação logo abaixo."}
          </p>
        </div>

        {GRUPOS_CANAL.map(({ grupo, descricao }) => (
          <div key={grupo} className="space-y-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[14px] font-medium text-[var(--tinta)]">{grupo}</span>
              <span className="text-[13px] text-[var(--tinta-faint)]">{descricao}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CANAIS.filter((c) => c.grupo === grupo).map((canal) => {
                const conectado = conectados.includes(canal.id);
                const hoje = demo?.resumoHoje[canal.id];
                return (
                  <div key={canal.id} className="rounded-xl border p-4 flex flex-col gap-3" style={{ ...painel, borderColor: conectado ? "color-mix(in srgb, var(--sucesso) 35%, var(--linha))" : "var(--linha)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-semibold text-[var(--tinta)]">{canal.nome}</span>
                      {conectado ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: "color-mix(in srgb, var(--sucesso) 10%, transparent)", color: "var(--sucesso)" }}>
                          <Check size={12} strokeWidth={2.5} />
                          Conectado
                        </span>
                      ) : !demo ? (
                        <span className="text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--panel-elevated)", color: "var(--tinta-sub)" }}>
                          Em breve
                        </span>
                      ) : null}
                    </div>
                    {conectado ? (
                      <div className="text-[13px] text-[var(--tinta-sub)] flex items-center gap-2 flex-wrap">
                        {hoje ? `Hoje: ${hoje.pedidos} pedidos · ${formatBRL(hoje.valor)}` : "Aguardando a primeira venda"}
                        <SeloDemo />
                      </div>
                    ) : demo ? (
                      <button
                        onClick={() => setConectados((c) => [...c, canal.id])}
                        className="flex items-center justify-center gap-2 text-[14px] font-medium px-3 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
                        style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
                      >
                        <Plug size={15} />
                        Conectar
                      </button>
                    ) : (
                      <div className="text-[13px] text-[var(--tinta-faint)]">Use a importação por XML ou planilha.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Sem integração: XML fiscal ou planilha. */}
      <section aria-labelledby="titulo-sem" className="space-y-3">
        <div>
          <h3 id="titulo-sem" className="text-[16px] font-semibold text-[var(--tinta)]">
            Sem integração com o PDV
          </h3>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-3xl">
            Funciona com qualquer PDV, mesmo os que não liberam integração: as vendas vêm das notas fiscais que ele já emite, ou da planilha que ele exporta.
          </p>
        </div>
        <ImportadorVendas fichas={fichas} basePath={basePath} notasExemplo={demo?.notasExemplo} />
      </section>
    </div>
  );
}
