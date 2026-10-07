"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Papel } from "@/lib/auth/papeis";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import { CATEGORIAS_PEDIDO, podeAprovarCompras, type NovaRequisicao, type Requisicao, type StatusRequisicao } from "@/lib/dominio/requisicao";
import { dataBR, numeroBR } from "@/lib/formato";
import { useToast } from "@/components/ficha/Toast";
import { NavegacaoEstoque } from "@/components/estoque/NavegacaoEstoque";
import { NovaRequisicaoForm } from "@/components/estoque/NovaRequisicaoForm";
import { PedidosDaCozinha } from "@/components/estoque/PedidosDaCozinha";
import { acaoResolverRequisicoes, acaoSolicitarCompra } from "../actions";

type Resultado = { ok: true } | { ok: false; erro: string };
const botao = "min-h-11 rounded-lg border border-[var(--linha-forte)] px-3 text-sm font-medium text-[var(--tinta)] disabled:opacity-50 hover:bg-[var(--panel-hover)]";
const quando = (data: string) => dataBR(data, { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
export function ComprasClient({ requisicoes, insumos, fornecedores, papel, nomeRestaurante, estoquePermitido = false, resolver = acaoResolverRequisicoes, solicitar = acaoSolicitarCompra }: {
  requisicoes: Requisicao[]; insumos: Insumo[]; fornecedores: Fornecedor[]; papel: Papel; nomeRestaurante: string; estoquePermitido?: boolean;
  resolver?: (ids: string[], status: StatusRequisicao) => Promise<Resultado>; solicitar?: (r: NovaRequisicao) => Promise<Resultado>;
}) {
  const caminho = usePathname() ?? "";
  const [nova, setNova] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const { mostrarSucesso } = useToast();
  const podeAprovar = podeAprovarCompras(papel, estoquePermitido);
  const pendentes = requisicoes.filter(r => r.status === "pendente");
  const aprovadas = requisicoes.filter(r => r.status === "aprovado");
  const historico = requisicoes.filter(r => r.status === "comprado" || r.status === "cancelado");
  async function decidir(r: Requisicao, status: "aprovado" | "cancelado") {
    if (ocupado) return; setOcupado(r.id); setErro("");
    try { const resposta = await resolver([r.id], status); if (!resposta.ok) setErro(resposta.erro); else mostrarSucesso(status === "aprovado" ? `${r.descricao}: compra aprovada.` : `${r.descricao}: requisição rejeitada.`); }
    catch { setErro("Não foi possível registrar a decisão. Atualize Compras e tente novamente."); }
    finally { setOcupado(null); }
  }
  if (papel === "cozinha") return <p className="text-sm text-[var(--tinta-sub)]">Use Pedidos no aparelho da cozinha para solicitar itens e acompanhar a aprovação.</p>;
  return <div className="max-w-5xl space-y-6">
    <NavegacaoEstoque pendentes={pendentes.length} />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-[var(--tinta)]">Compras</h2><p className="mt-1 text-sm text-[var(--tinta-sub)]">{estoquePermitido ? "O estoque pode solicitar, aprovar e confirmar compras, conforme a permissão da gestão." : "O estoque solicita, o gestor ou dono aprova e a equipe de compras confirma a compra."}</p></div>
      <button onClick={() => setNova(!nova)} className={botao}>{nova ? "Fechar requisição" : "+ Nova requisição"}</button>
    </div>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[{ titulo: "Aguardando aprovação", quantidade: pendentes.length }, { titulo: "Aprovadas para comprar", quantidade: aprovadas.length }, { titulo: "Concluídas nos últimos 3 dias", quantidade: historico.length }].map(i => <div key={i.titulo} className="rounded-xl border border-[var(--linha)] bg-[var(--panel)] px-4 py-3"><dt className="text-sm text-[var(--tinta-sub)]">{i.titulo}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--tinta)]">{i.quantidade}</dd></div>)}</dl>
    {nova && <NovaRequisicaoForm insumos={insumos} solicitar={solicitar} fechar={() => setNova(false)} />}
    {erro && <p role="alert" className="text-sm text-[var(--sinal)]">{erro}</p>}
    <section aria-label="Aguardando aprovação" className="rounded-xl border border-[var(--linha)] bg-[var(--panel)]">
      <div className="border-b border-[var(--linha)] p-4 md:px-5"><h2 className="font-semibold text-[var(--tinta)]">Aguardando aprovação · {pendentes.length}</h2><p className="mt-1 text-sm text-[var(--tinta-sub)]">{podeAprovar ? "Confira as solicitações do estoque e da cozinha antes de autorizar a compra." : "Suas requisições e os pedidos da cozinha aguardam a decisão de uma pessoa autorizada."}</p></div>
      {!pendentes.length ? <p className="p-5 text-sm text-[var(--tinta-sub)]">Nenhuma requisição aguardando aprovação.</p> : <ul className="divide-y divide-[var(--linha)]">{pendentes.map(r => <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4 md:px-5">
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-[var(--tinta)] break-words">{r.descricao}{r.quantidade !== null && <span className="font-normal text-[var(--tinta-sub)]"> · {numeroBR(r.quantidade, { maximumFractionDigits: 3 })} {r.unidade}</span>}</h3><p className="mt-1 text-xs text-[var(--tinta-sub)]">{CATEGORIAS_PEDIDO.find(c => c.id === r.categoria)?.rotulo} · Solicitado por {r.responsavel} · {quando(r.criadoEm)}</p>{r.observacao && <p className="mt-1 text-sm text-[var(--tinta-sub)] break-words">{r.observacao}</p>}</div>
        {podeAprovar && <div className="flex flex-wrap gap-2"><button className={botao} disabled={ocupado !== null} aria-label={`Aprovar ${r.descricao}`} onClick={() => decidir(r, "aprovado")}>{ocupado === r.id ? "Registrando…" : "Aprovar"}</button><button className={botao} disabled={ocupado !== null} aria-label={`Rejeitar ${r.descricao}`} onClick={() => decidir(r, "cancelado")}>Rejeitar</button></div>}
      </li>)}</ul>}
    </section>
    <section aria-label="Aprovadas para comprar"><PedidosDaCozinha podeCancelar={podeAprovar} requisicoes={aprovadas} fornecedores={fornecedores} nomeRestaurante={nomeRestaurante} resolver={resolver} /></section>
    <section aria-label="Histórico de compras" className="rounded-xl border border-[var(--linha)] bg-[var(--panel)] p-4 md:p-5 space-y-3"><h2 className="font-semibold text-[var(--tinta)]">Histórico dos últimos 3 dias</h2>{!historico.length ? <p className="text-sm text-[var(--tinta-sub)]">Nenhuma compra concluída ou requisição rejeitada neste período.</p> : <ul className="divide-y divide-[var(--linha)]">{historico.map(r => <li key={r.id} className="py-3 text-sm text-[var(--tinta-sub)]"><div className="flex flex-wrap justify-between gap-2"><strong className="font-medium text-[var(--tinta)] break-words">{r.descricao}{r.quantidade !== null ? ` · ${numeroBR(r.quantidade, { maximumFractionDigits: 3 })} ${r.unidade}` : ""}</strong><span>{r.status === "comprado" ? "Compra confirmada" : "Rejeitada / cancelada"}</span></div><p className="mt-1">Solicitado por {r.responsavel}{r.aprovadoEm ? ` · Aprovado por ${r.aprovadoNome ?? "Gestão"} em ${quando(r.aprovadoEm)}` : ""}</p>{r.resolvidoEm && <p className="mt-1">{r.status === "comprado" ? "Confirmado" : "Decidido"} por {r.resolvidoNome ?? "Equipe"} em {quando(r.resolvidoEm)}</p>}</li>)}</ul>}</section>
    <p className="text-sm text-[var(--tinta-sub)]">Confirmar a compra registra a conclusão da requisição. Para atualizar o saldo, registre o recebimento em Estoque ou importe a NF-e.{!caminho.startsWith("/preview") && <> <Link href="/estoque/nota-compra" className="underline underline-offset-2 text-[var(--tinta)]">Importar NF-e de compra</Link></>}</p>
  </div>;
}
