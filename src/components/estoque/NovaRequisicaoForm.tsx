"use client";
import { useId, useState, type FormEvent } from "react";
import type { Insumo } from "@/lib/dominio/insumo";
import { CATEGORIAS_PEDIDO, UNIDADES_PEDIDO, categoriaDoInsumo, validarRequisicao, type CategoriaPedido, type NovaRequisicao, type UnidadePedido } from "@/lib/dominio/requisicao";

type Resultado = { ok: true } | { ok: false; erro: string };
const campo = "w-full min-h-11 rounded-lg border border-[var(--linha-forte)] bg-[var(--panel)] px-3 text-sm text-[var(--tinta)]";
export function NovaRequisicaoForm({ insumos, solicitar, fechar }: { insumos: Insumo[]; solicitar: (r: NovaRequisicao) => Promise<Resultado>; fechar: () => void }) {
  const id = useId();
  const [insumoId, setInsumoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPedido>("hortifruti");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<UnidadePedido>("kg");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  function escolher(valor: string) {
    setInsumoId(valor);
    const insumo = insumos.find(i => i.id === valor);
    if (insumo) { setDescricao(insumo.nome); setCategoria(categoriaDoInsumo(insumo.categoria)); if (UNIDADES_PEDIDO.includes(insumo.unidadeMedida as UnidadePedido)) setUnidade(insumo.unidadeMedida as UnidadePedido); }
  }
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (ocupado) return;
    const r: NovaRequisicao = { insumoId: insumoId || null, descricao, categoria, quantidade: quantidade.trim() ? Number(quantidade.replace(",", ".")) : null, unidade: quantidade.trim() ? unidade : null, observacao: observacao.trim() || null };
    const problema = validarRequisicao(r); if (problema) { setErro(problema); return; }
    setOcupado(true); setErro("");
    try { const resultado = await solicitar(r); if (!resultado.ok) setErro(resultado.erro); else fechar(); }
    catch { setErro("Não foi possível enviar a requisição. Tente novamente."); }
    finally { setOcupado(false); }
  }
  return <form onSubmit={enviar} aria-label="Nova requisição de compra" className="rounded-xl border border-[var(--linha)] bg-[var(--panel)] p-4 md:p-5 space-y-4">
    <div><h2 className="font-semibold text-[var(--tinta)]">Nova requisição</h2><p className="mt-1 text-sm text-[var(--tinta-sub)]">O pedido será encaminhado para aprovação do gestor ou dono.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label htmlFor={`${id}-insumo`} className="space-y-1 text-sm text-[var(--tinta-sub)]"><span>Insumo cadastrado (opcional)</span><select id={`${id}-insumo`} value={insumoId} onChange={e => escolher(e.target.value)} className={campo}><option value="">Outro item</option>{insumos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      <label htmlFor={`${id}-descricao`} className="space-y-1 text-sm text-[var(--tinta-sub)]"><span>Item da compra</span><input id={`${id}-descricao`} value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={120} required className={campo} readOnly={Boolean(insumoId)} /></label>
      <label htmlFor={`${id}-categoria`} className="space-y-1 text-sm text-[var(--tinta-sub)]"><span>Categoria</span><select id={`${id}-categoria`} value={categoria} onChange={e => setCategoria(e.target.value as CategoriaPedido)} className={campo}>{CATEGORIAS_PEDIDO.map(c => <option key={c.id} value={c.id}>{c.rotulo}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor={`${id}-quantidade`} className="space-y-1 text-sm text-[var(--tinta-sub)]"><span>Quantidade (opcional)</span><input id={`${id}-quantidade`} inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value)} className={campo} /></label>
        <label htmlFor={`${id}-unidade`} className="space-y-1 text-sm text-[var(--tinta-sub)]"><span>Unidade</span><select id={`${id}-unidade`} value={unidade} onChange={e => setUnidade(e.target.value as UnidadePedido)} className={campo}>{UNIDADES_PEDIDO.map(u => <option key={u} value={u}>{u}</option>)}</select></label>
      </div>
    </div>
    <label htmlFor={`${id}-observacao`} className="block space-y-1 text-sm text-[var(--tinta-sub)]"><span>Observação</span><textarea id={`${id}-observacao`} value={observacao} onChange={e => setObservacao(e.target.value)} maxLength={200} rows={2} className={`${campo} py-2`} /></label>
    {erro && <p role="alert" className="text-sm text-[var(--sinal)]">{erro}</p>}
    <div className="flex flex-wrap gap-2"><button disabled={ocupado} className="min-h-11 rounded-lg bg-[var(--tinta)] px-4 text-sm font-medium text-[var(--panel)] disabled:opacity-50">{ocupado ? "Enviando…" : "Enviar para aprovação"}</button><button type="button" onClick={fechar} disabled={ocupado} className="min-h-11 rounded-lg border border-[var(--linha)] px-4 text-sm text-[var(--tinta)]">Fechar</button></div>
  </form>;
}
