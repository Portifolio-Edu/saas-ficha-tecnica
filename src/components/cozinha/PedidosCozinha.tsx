"use client";

// PEDIDOS DA COZINHA (2026-09-26): a cozinha avisa quem compra o que falta.
// Uma categoria por vez (hortifrúti, proteínas, secos, laticínios, outros);
// em cima, o prazo do fornecedor que atende a categoria ("peça até terça às
// 18h pra chegar quarta"), vindo do cadastro em Estoque → Fornecedores.
// Casa sem estoquista depende disso — e hortifrúti muda tanto que muitas
// vezes só a cozinha sabe o que precisa.
// Toque grande (tablet na bancada) e uma coluna (celular).

import { useEffect, useMemo, useState } from "react";
import { Clock, Plus, ShoppingBasket, X } from "lucide-react";
import { useToast } from "@/components/ficha/Toast";
import {
  CATEGORIAS_PEDIDO, UNIDADES_PEDIDO, agoraNoRestaurante, frasePrazo, pedidosDaCategoria, validarRequisicao,
  type Agora, type AgendaFornecedor, type CategoriaPedido, type NovaRequisicao, type Requisicao, type UnidadePedido,
} from "@/lib/dominio/requisicao";
import type { ResultadoCozinha } from "./CozinhaApp";

export interface SugestaoPedido {
  id: string;
  nome: string;
  categoria: CategoriaPedido;
}

const campo = "min-h-14 px-4 rounded-xl text-[17px] outline-none w-full focus:ring-2 focus:ring-[var(--marca-suave)] focus:border-[var(--marca)]";
const estiloCampo = { border: "1px solid var(--linha-forte)", background: "var(--panel)", color: "var(--tinta)" } as const;

function haQuanto(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

function faltam(min: number): string {
  if (min < 60) return `faltam ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `faltam ${h}h${m ? String(m).padStart(2, "0") : ""}`;
}

export function quantidadeTexto(r: { quantidade: number | null; unidade: string | null }): string {
  if (r.quantidade === null) return "";
  return `${r.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${r.unidade ?? ""}`.trim();
}

export function PedidosCozinha({
  requisicoes,
  agenda,
  sugestoes,
  responsavel,
  agoraInicial,
  pedir,
  desistir,
}: {
  requisicoes: Requisicao[];
  agenda: AgendaFornecedor[];
  sugestoes: SugestaoPedido[];
  responsavel: string;
  /** Relógio do restaurante vindo do servidor (evita piscar na hidratação). */
  agoraInicial: Agora;
  pedir: (r: NovaRequisicao, responsavel: string) => Promise<ResultadoCozinha>;
  desistir: (id: string) => Promise<ResultadoCozinha>;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [categoria, setCategoria] = useState<CategoriaPedido>("hortifruti");
  const [agora, setAgora] = useState<Agora>(agoraInicial);
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<UnidadePedido>("kg");
  const [observacao, setObservacao] = useState("");
  const [comObservacao, setComObservacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  useEffect(() => {
    setAgora(agoraNoRestaurante());
    const t = setInterval(() => setAgora(agoraNoRestaurante()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pendentes = requisicoes.filter((r) => r.status === "pendente");
  const pendentesDaCategoria = pendentes.filter((r) => r.categoria === categoria);
  const compradasDaCategoria = requisicoes.filter((r) => r.status === "comprado" && r.categoria === categoria).slice(0, 8);
  const prazos = useMemo(() => pedidosDaCategoria(agenda, categoria, agora).slice(0, 2), [agenda, categoria, agora]);
  const sugestoesDaCategoria = sugestoes.filter((s) => s.categoria === categoria);
  const rotulo = CATEGORIAS_PEDIDO.find((c) => c.id === categoria)!.rotulo;

  const enviar = async () => {
    const sugestao = sugestoes.find((s) => s.nome.toLowerCase() === descricao.trim().toLowerCase());
    const qtd = quantidade.trim() ? Number(quantidade.replace(",", ".")) : null;
    const nova: NovaRequisicao = {
      categoria,
      insumoId: sugestao?.id ?? null,
      descricao: sugestao?.nome ?? descricao,
      quantidade: qtd,
      unidade: qtd === null ? null : unidade,
      observacao: observacao.trim() || null,
    };
    const problema = validarRequisicao(nova);
    if (problema) return mostrarErro(problema);
    setEnviando(true);
    const r = await pedir(nova, responsavel);
    setEnviando(false);
    if (!r.ok) return mostrarErro(r.erro);
    mostrarSucesso(`${nova.descricao} no pedido de ${rotulo.toLowerCase()}.`);
    setDescricao("");
    setQuantidade("");
    setObservacao("");
    setComObservacao(false);
  };

  const tirar = async (r: Requisicao) => {
    if (!window.confirm(`Tirar "${r.descricao}" do pedido?`)) return;
    setRemovendo(r.id);
    const res = await desistir(r.id);
    setRemovendo(null);
    if (!res.ok) mostrarErro(res.erro);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">Pedidos pra compra</h2>
        <p className="text-[15px] text-[var(--tinta-sub)] mt-1">
          O que está faltando ou vai faltar. Quem faz as compras recebe na hora
          {pendentes.length > 0 ? ` · ${pendentes.length} ${pendentes.length === 1 ? "item pendente" : "itens pendentes"}` : ""}.
        </p>
      </div>

      <div role="tablist" aria-label="Categoria do pedido" className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {CATEGORIAS_PEDIDO.map((c) => {
          const n = pendentes.filter((r) => r.categoria === c.id).length;
          const ativa = c.id === categoria;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={ativa}
              onClick={() => setCategoria(c.id)}
              className="shrink-0 min-h-12 px-4 rounded-xl border text-[15px] font-semibold inline-flex items-center gap-2"
              style={{
                borderColor: ativa ? "var(--tinta)" : "var(--linha-forte)",
                background: ativa ? "var(--tinta)" : "var(--panel)",
                color: ativa ? "var(--panel)" : "var(--tinta)",
              }}
            >
              {c.rotulo}
              {n > 0 && (
                <span
                  className="min-w-6 h-6 px-1.5 rounded-full text-[13px] inline-flex items-center justify-center"
                  style={{ background: ativa ? "var(--panel)" : "var(--tinta)", color: ativa ? "var(--tinta)" : "var(--panel)" }}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Prazo do fornecedor */}
      <section aria-label={`Prazo de ${rotulo}`} className="rounded-xl border p-4" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
        {prazos.length === 0 ? (
          <p className="text-[15px] text-[var(--tinta-sub)]">
            Nenhum fornecedor de {rotulo.toLowerCase()} com dia de entrega cadastrado. Quem compra cadastra em Estoque → Fornecedores.
          </p>
        ) : (
          <ul className="space-y-3">
            {prazos.map((p) => {
              const apertado = p.minutosRestantes <= 180;
              return (
                <li key={p.empresa} className="flex items-start gap-3">
                  <Clock size={20} className="shrink-0 mt-0.5" style={{ color: apertado ? "var(--aviso)" : "var(--tinta-faint)" }} />
                  <div>
                    <div className="text-[16px] font-semibold text-[var(--tinta)]">{frasePrazo(p, agora)}</div>
                    <div className="text-[14px] text-[var(--tinta-sub)]">
                      {p.empresa}
                      {apertado && <strong style={{ color: "var(--aviso)" }}> · {faltam(p.minutosRestantes)}</strong>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Novo item */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--linha)", background: "var(--panel)" }}
      >
        <label className="block text-[15px] font-medium text-[var(--tinta)]">
          O que precisa?
          <input
            list={`sugestoes-${categoria}`}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={categoria === "hortifruti" ? "ex.: tomate, coentro" : categoria === "proteinas" ? "ex.: peito de frango" : "nome do item"}
            className={`${campo} mt-1.5`}
            style={estiloCampo}
            autoComplete="off"
            enterKeyHint="next"
          />
          <datalist id={`sugestoes-${categoria}`}>
            {sugestoesDaCategoria.map((s) => (
              <option key={s.id} value={s.nome} />
            ))}
          </datalist>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="block text-[15px] font-medium text-[var(--tinta)]">
            Quanto (opcional)
            <input
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="ex.: 5"
              className={`${campo} mt-1.5`}
              style={estiloCampo}
            />
          </label>
          <label className="block text-[15px] font-medium text-[var(--tinta)]">
            Unidade
            <select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadePedido)} className={`${campo} mt-1.5 pr-8`} style={estiloCampo}>
              {UNIDADES_PEDIDO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        {comObservacao ? (
          <label className="block text-[15px] font-medium text-[var(--tinta)]">
            Observação
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 200))}
              placeholder="ex.: bem maduro, pro almoço de sábado"
              className={`${campo} mt-1.5`}
              style={estiloCampo}
            />
          </label>
        ) : (
          <button type="button" onClick={() => setComObservacao(true)} className="min-h-11 text-[15px] font-medium text-[var(--tinta-sub)] underline underline-offset-4">
            + observação
          </button>
        )}
        <button
          type="submit"
          disabled={enviando || !descricao.trim()}
          className="w-full min-h-14 rounded-xl text-[17px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: "var(--tinta)", color: "var(--panel)" }}
        >
          <Plus size={20} /> {enviando ? "Pedindo…" : `Pedir em ${rotulo.toLowerCase()}`}
        </button>
      </form>

      {/* Pendentes */}
      <section aria-label={`Pedido de ${rotulo} pendente`}>
        <h3 className="text-[17px] font-semibold text-[var(--tinta)] mb-2">No pedido de {rotulo.toLowerCase()}</h3>
        {pendentesDaCategoria.length === 0 ? (
          <div className="rounded-xl border p-5 text-center text-[15px] text-[var(--tinta-sub)]" style={{ borderColor: "var(--linha)" }}>
            <ShoppingBasket size={22} className="mx-auto mb-2 text-[var(--tinta-faint)]" />
            Nada pedido em {rotulo.toLowerCase()}.
          </div>
        ) : (
          <ul className="rounded-xl border divide-y" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
            {pendentesDaCategoria.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--linha)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-semibold text-[var(--tinta)]">
                    {r.descricao}
                    {r.quantidade !== null && <span className="font-normal text-[var(--tinta-sub)]"> · {quantidadeTexto(r)}</span>}
                  </div>
                  {r.observacao && <div className="text-[14px] text-[var(--tinta)] mt-0.5">{r.observacao}</div>}
                  <div className="text-[13px] text-[var(--tinta-faint)] mt-0.5">
                    {r.responsavel} · {haQuanto(r.criadoEm)}
                  </div>
                </div>
                <button
                  onClick={() => tirar(r)}
                  disabled={removendo === r.id}
                  aria-label={`Tirar ${r.descricao} do pedido`}
                  className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--danger)] hover:bg-[var(--panel-hover)] disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {compradasDaCategoria.length > 0 && (
        <section aria-label="Comprados nos últimos dias">
          <h3 className="text-[15px] font-medium text-[var(--tinta-sub)] mb-2">Comprados nos últimos dias</h3>
          <ul className="space-y-1">
            {compradasDaCategoria.map((r) => (
              <li key={r.id} className="text-[15px] text-[var(--tinta-sub)]">
                ✓ {r.descricao}
                {r.quantidade !== null ? ` · ${quantidadeTexto(r)}` : ""}
                {r.resolvidoEm ? ` · ${haQuanto(r.resolvidoEm)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
