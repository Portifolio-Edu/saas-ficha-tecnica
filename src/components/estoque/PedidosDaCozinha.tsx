"use client";

// PEDIDOS DA COZINHA (2026-09-26): o que a cozinha pediu, do lado de quem
// compra (dono, gestor ou estoquista). Por categoria, com o prazo do
// fornecedor que atende ("peça até hoje às 18h pra chegar amanhã"), botão pra
// mandar a lista pro fornecedor no WhatsApp e marcar como comprado.
// Pensado pro celular: quem compra muitas vezes resolve isso fora do restaurante.

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, MessageCircle, ShoppingBasket } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { useToast } from "@/components/ficha/Toast";
import { agendaDoFornecedor, type Fornecedor } from "@/lib/dominio/fornecedor";
import {
  CATEGORIAS_PEDIDO, agoraNoRestaurante, frasePrazo, pedidosDaCategoria,
  type Agora, type CategoriaPedido, type Requisicao, type StatusRequisicao,
} from "@/lib/dominio/requisicao";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

type Resultado = { ok: true } | { ok: false; erro: string };

function quantidade(r: Requisicao): string {
  if (r.quantidade === null) return "";
  return `${r.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${r.unidade ?? ""}`.trim();
}

function linkWhatsApp(f: Fornecedor, itens: Requisicao[], restaurante: string, entrega: string | null): string | null {
  if (!telefoneValido(f.telefone)) return null;
  const saudacao = f.contato ? `Olá, ${f.contato.split(" ")[0]}!` : "Olá!";
  const linhas = itens.map((r) => `• ${r.descricao}${r.quantidade !== null ? ` — ${quantidade(r)}` : ""}${r.observacao ? ` (${r.observacao})` : ""}`);
  const texto = `${saudacao} Pedido do ${restaurante}${entrega ? ` pra ${entrega}` : ""}:\n${linhas.join("\n")}\nObrigado!`;
  return `https://wa.me/${normalizarTelefone(f.telefone)}?text=${encodeURIComponent(texto)}`;
}

function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  const dia = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][new Date(`${iso}T12:00:00Z`).getUTCDay()];
  return `${dia} ${d}/${m}`;
}

export function PedidosDaCozinha({
  requisicoes,
  fornecedores,
  nomeRestaurante,
  agoraInicial,
  resolver,
}: {
  requisicoes: Requisicao[];
  fornecedores: Fornecedor[];
  nomeRestaurante: string;
  agoraInicial?: Agora;
  resolver: (ids: string[], status: StatusRequisicao) => Promise<Resultado>;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [agora, setAgora] = useState<Agora | null>(agoraInicial ?? null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    setAgora(agoraNoRestaurante());
    const t = setInterval(() => setAgora(agoraNoRestaurante()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pendentes = requisicoes.filter((r) => r.status === "pendente");
  const agenda = useMemo(() => fornecedores.map(agendaDoFornecedor), [fornecedores]);
  const grupos = CATEGORIAS_PEDIDO.map((c) => ({ ...c, itens: pendentes.filter((r) => r.categoria === c.id) })).filter((g) => g.itens.length > 0);

  const marcar = async (ids: string[], chave: string, texto: string) => {
    setOcupado(chave);
    const r = await resolver(ids, "comprado");
    setOcupado(null);
    if (!r.ok) return mostrarErro(r.erro);
    mostrarSucesso(texto);
  };

  return (
    <Card>
      <div className="px-4 md:px-5 py-4 flex items-start gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
        <ShoppingBasket size={20} className="text-[var(--tinta-faint)] mt-0.5 shrink-0" />
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">
            Pedidos da cozinha{pendentes.length > 0 ? ` · ${pendentes.length}` : ""}
          </h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            O que a cozinha pediu na aba Pedidos do tablet. O prazo vem dos dias de entrega cadastrados em Fornecedores, aqui embaixo.
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="px-4 md:px-5 py-5 text-[14px] text-[var(--tinta-sub)]">Nenhum pedido pendente. Quando a cozinha pedir, aparece aqui na hora.</p>
      ) : (
        <ul>
          {grupos.map((g) => {
            const prazos = agora ? pedidosDaCategoria(agenda, g.id as CategoriaPedido, agora) : [];
            const prazo = prazos[0];
            const fornecedor = prazo ? fornecedores.find((f) => f.empresa === prazo.empresa) : undefined;
            const whats = fornecedor ? linkWhatsApp(fornecedor, g.itens, nomeRestaurante, prazo ? dataCurta(prazo.entrega) : null) : null;
            const apertado = prazo && prazo.minutosRestantes <= 180;
            return (
              <li key={g.id} className="border-t first:border-t-0 px-4 md:px-5 py-4" style={{ borderColor: "var(--linha)" }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--tinta)]">
                      {g.rotulo} <span className="font-normal text-[var(--tinta-sub)]">· {g.itens.length} {g.itens.length === 1 ? "item" : "itens"}</span>
                    </h3>
                    <p className="text-[13px] mt-0.5 flex items-start gap-1.5" style={{ color: apertado ? "var(--aviso)" : "var(--tinta-sub)" }}>
                      <Clock size={14} className="mt-0.5 shrink-0" />
                      {prazo && agora ? `${prazo.empresa}: ${frasePrazo(prazo, agora).replace(/^P/, "p")}` : "Sem fornecedor com dia de entrega pra esta categoria."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {whats && (
                      <a
                        href={whats}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 min-h-11 md:min-h-9 px-3 rounded-lg border text-[13px] font-medium"
                        style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
                      >
                        <MessageCircle size={15} /> Pedir no WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => marcar(g.itens.map((r) => r.id), g.id, `${g.rotulo}: tudo comprado.`)}
                      disabled={ocupado !== null}
                      className="inline-flex items-center gap-1.5 min-h-11 md:min-h-9 px-3 rounded-lg text-[13px] font-medium disabled:opacity-60"
                      style={{ background: "var(--tinta)", color: "var(--panel)" }}
                    >
                      <Check size={15} /> {ocupado === g.id ? "Marcando…" : "Tudo comprado"}
                    </button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1">
                  {g.itens.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] md:text-[14px] text-[var(--tinta)]">
                          <strong className="font-medium">{r.descricao}</strong>
                          {r.quantidade !== null && <span className="text-[var(--tinta-sub)]"> · {quantidade(r)}</span>}
                        </div>
                        {r.observacao && <div className="text-[13px] text-[var(--tinta)]">{r.observacao}</div>}
                        <div className="text-[12.5px] text-[var(--tinta-faint)]">
                          {r.responsavel} · {new Date(r.criadoEm).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button
                        onClick={() => marcar([r.id], r.id, `${r.descricao}: comprado.`)}
                        disabled={ocupado !== null}
                        aria-label={`Marcar ${r.descricao} como comprado`}
                        className="shrink-0 min-h-11 md:min-h-9 px-3 rounded-lg border text-[13px] font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        style={{ borderColor: "var(--linha-forte)" }}
                      >
                        Comprado
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
