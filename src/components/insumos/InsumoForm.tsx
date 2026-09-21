"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import { CATEGORIAS, UNIDADES, type Categoria, type Insumo, type InsumoInput } from "@/lib/dominio/insumo";
import type { UnidadeMedida } from "@/lib/calculo/types";
import type { LocalArmazenamento } from "@/lib/dominio/temperatura";
import { acaoCriarInsumo, acaoAtualizarInsumo } from "@/app/insumos/actions";

export function InsumoForm({
  insumo,
  locais,
  onCancel,
  onSaved,
}: {
  insumo?: Insumo;
  locais: LocalArmazenamento[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(insumo?.nome ?? "");
  const [categoria, setCategoria] = useState<Categoria>(insumo?.categoria ?? "outro");
  const [unidade, setUnidade] = useState<UnidadeMedida>(insumo?.unidadeMedida ?? "kg");
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState(insumo ? String(insumo.tamanhoEmbalagem) : "");
  const [precoEmbalagem, setPrecoEmbalagem] = useState(insumo ? String(insumo.precoEmbalagem) : "");
  const [fc, setFc] = useState(insumo ? String(insumo.fatorCorrecao) : "1");
  const [pesoPorUnidade, setPesoPorUnidade] = useState(insumo?.pesoPorUnidade != null ? String(insumo.pesoPorUnidade) : "");
  const [localArmazenamentoId, setLocalArmazenamentoId] = useState(insumo?.localArmazenamentoId ?? "");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const salvar = () => {
    if (!nome.trim() || !tamanhoEmbalagem || !precoEmbalagem) return;
    const input: InsumoInput = {
      nome: nome.trim(),
      categoria,
      unidadeMedida: unidade,
      tamanhoEmbalagem: parseFloat(tamanhoEmbalagem),
      precoEmbalagem: parseFloat(precoEmbalagem),
      fatorCorrecao: parseFloat(fc) || 1,
      pesoPorUnidade: unidade === "un" && pesoPorUnidade ? parseFloat(pesoPorUnidade) : null,
      localArmazenamentoId: localArmazenamentoId || null,
    };
    executar(() => (insumo ? acaoAtualizarInsumo(insumo.id, input) : acaoCriarInsumo(input)));
  };

  return (
    <div className="px-5 py-4" style={{ borderTop: `1px solid ${"var(--border)"}`, background: "var(--bg)" }}>
      <div className="grid grid-cols-6 gap-2 mb-2">
        <Input placeholder="Nome do insumo" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeMedida)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <Input placeholder="FC" type="number" step="0.01" value={fc} onChange={(e) => setFc(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <Input placeholder="Tamanho embalagem" type="number" value={tamanhoEmbalagem} onChange={(e) => setTamanhoEmbalagem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Preço pago (R$)" type="number" value={precoEmbalagem} onChange={(e) => setPrecoEmbalagem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        {unidade === "un" && (
          <Input placeholder="Peso por unidade (kg)" type="number" value={pesoPorUnidade} onChange={(e) => setPesoPorUnidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        )}
      </div>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <select value={localArmazenamentoId} onChange={(e) => setLocalArmazenamentoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-3" style={inputStyle}>
          <option value="">Sem local de armazenamento</option>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
      </div>
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : insumo ? "Salvar alterações" : "Salvar insumo"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
