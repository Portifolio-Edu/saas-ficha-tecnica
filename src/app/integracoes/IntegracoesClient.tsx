"use client";

// INTEGRACOES (2026-09-23) -- tela nova, pedido do usuário: integrar com os PDVs
// do mercado e com o iFood, e ter uma alternativa quando o PDV não libera
// integração. Posição de venda: o Ficha Técnica soma ao PDV, não substitui.
//
// O que é real e o que é simulado:
//  - Importação de XML fiscal e de planilha: REAL (components/integracoes).
//  - Conexão com PDV/iFood: NÃO EXISTE ainda. No app aparece "Em breve"; na demo
//    (/preview) iFood e Saipos aparecem conectados, com pedidos chegando, sempre
//    com o selo "demo" (escolha do usuário em 2026-09-23).
//  - PRIORIDADE (2026-09-26): só iFood, Anota AI e Saipos em destaque (e, na
//    demo, conectáveis); os demais ficam "Em breve" nos dois modos.
// Pra tirar a tela: apagar src/app/integracoes, src/app/preview/integracoes, o
// item "Integrações" em ShellPremium.tsx e em preview/page.tsx.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Plug, Sparkles } from "lucide-react";
import { CANAIS, CANAIS_EM_BREVE, CANAIS_PRIORIDADE, type PedidoRecebido } from "@/lib/integracoes/pdvs";
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

      {/* PRIORIDADE (2026-09-26): lançamento com iFood, Anota AI e Saipos em
          destaque; os outros canais ficam "Em breve" (pdvs.ts). */}
      <section aria-labelledby="titulo-canais" className="space-y-4">
        <div>
          <h3 id="titulo-canais" className="text-[16px] font-semibold text-[var(--tinta)]">
            Integrações do lançamento
          </h3>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-3xl">
            {demo
              ? "Na demonstração, a conexão é simulada. No sistema, cada canal pede o token de integração que ele fornece."
              : "Começamos por estes três. A conexão direta está em implantação; enquanto isso, as vendas entram pela importação logo abaixo."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CANAIS_PRIORIDADE.map((canal) => {
            const conectado = conectados.includes(canal.id);
            const hoje = demo?.resumoHoje[canal.id];
            return (
              <div
                key={canal.id}
                className="rounded-2xl border-2 p-5 flex flex-col gap-3"
                style={{
                  ...painel,
                  borderColor: conectado ? "color-mix(in srgb, var(--sucesso) 45%, var(--linha))" : "color-mix(in srgb, var(--marca) 40%, var(--linha))",
                  background: conectado ? "var(--panel)" : "color-mix(in srgb, var(--marca) 4%, var(--panel))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[19px] font-semibold tracking-tight text-[var(--tinta)]">{canal.nome}</div>
                    <div className="text-[12.5px] text-[var(--tinta-faint)]">{canal.grupo}</div>
                  </div>
                  {conectado ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: "color-mix(in srgb, var(--sucesso) 10%, transparent)", color: "var(--sucesso)" }}>
                      <Check size={12} strokeWidth={2.5} />
                      Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "var(--marca-suave)", color: "var(--marca)" }}>
                      <Sparkles size={12} />
                      {demo ? "Lançamento" : "Em implantação"}
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[var(--tinta-sub)] flex-1">{canal.descricao}</p>
                {conectado ? (
                  <div className="text-[13px] text-[var(--tinta-sub)] flex items-center gap-2 flex-wrap">
                    {hoje ? `Hoje: ${hoje.pedidos} pedidos · ${formatBRL(hoje.valor)}` : "Aguardando a primeira venda"}
                    <SeloDemo />
                  </div>
                ) : demo ? (
                  <button
                    onClick={() => setConectados((c) => [...c, canal.id])}
                    className="flex items-center justify-center gap-2 text-[14px] font-medium px-3 min-h-11 rounded-lg"
                    style={{ background: "var(--tinta)", color: "var(--panel)" }}
                  >
                    <Plug size={15} />
                    Conectar {canal.nome}
                  </button>
                ) : (
                  <a href="#titulo-sem" className="text-[13px] font-medium text-[var(--marca)] underline underline-offset-2">
                    Enquanto isso: importar XML ou planilha
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border p-4 md:p-5" style={painel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[14px] font-medium text-[var(--tinta)]">Outros PDVs e maquininhas</span>
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--panel-elevated)", color: "var(--tinta-sub)" }}>
              Em breve
            </span>
          </div>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-1">Qualquer um deles já funciona hoje pela importação de XML fiscal ou planilha.</p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Integrações em breve">
            {CANAIS_EM_BREVE.map((c) => (
              <li key={c.id} className="text-[13px] px-2.5 py-1 rounded-full border text-[var(--tinta-sub)]" style={{ borderColor: "var(--linha)" }} title={c.grupo}>
                {c.nome}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sem integração: XML fiscal ou planilha. */}
      <section aria-labelledby="titulo-sem" className="space-y-3">
        <div>
          <h3 id="titulo-sem" className="scroll-mt-20 text-[16px] font-semibold text-[var(--tinta)]">
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
