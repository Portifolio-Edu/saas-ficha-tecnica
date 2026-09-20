"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import { UNIDADES, type Insumo } from "@/lib/dominio/insumo";
import type { LinhaFichaInput, Receita, ReceitaInput } from "@/lib/dominio/receita";
import type { UnidadeMedida } from "@/lib/calculo/types";
import { acaoCriarPreparo, acaoAtualizarPreparo } from "@/app/insumos/actions";

export function PreparoForm({
  insumos,
  preparo,
  onCancel,
  onSaved,
}: {
  insumos: Insumo[];
  preparo?: Receita;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(preparo?.nomePrato ?? "");
  const [rendimento, setRendimento] = useState(preparo ? String(preparo.rendimento) : "");
  const [unidadeRendimento, setUnidadeRendimento] = useState(preparo?.unidadeRendimento ?? "kg");
  const [ficha, setFicha] = useState<LinhaFichaInput[]>(
    preparo?.ficha.map((f) => ({ insumoId: f.insumoId, subReceitaId: null, pesoLiquido: f.pesoLiquido, unidade: f.unidade })) ?? [],
  );
  const [linhaInsumoId, setLinhaInsumoId] = useState(insumos[0]?.id ?? "");
  const [linhaPeso, setLinhaPeso] = useState("");
  const [linhaUnidade, setLinhaUnidade] = useState<UnidadeMedida>(insumos[0]?.unidadeMedida ?? "kg");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

  const addLinha = () => {
    if (!linhaInsumoId || !linhaPeso) return;
    setFicha([...ficha, { insumoId: linhaInsumoId, subReceitaId: null, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade }]);
    setLinhaPeso("");
  };
  const removerLinha = (idx: number) => setFicha(ficha.filter((_, i) => i !== idx));

  const salvar = () => {
    if (!nome.trim() || !rendimento || ficha.length === 0) return;
    const input: ReceitaInput = {
      nomePrato: nome.trim(),
      tipo: "preparo_base",
      categoria: null,
      precoVenda: null,
      vendasMes: null,
      rendimento: parseFloat(rendimento),
      unidadeRendimento,
      pesoPorcaoG: null,
      formaFisica: "solido",
      destinoVenda: "proprio",
      margemAlvo: null,
      modoPreparo: preparo?.modoPreparo ?? null,
      fotoUrl: preparo?.fotoUrl ?? null,
      ficha,
      etapas: preparo?.etapas.map((e) => ({ ordem: e.ordem, titulo: e.titulo, texto: e.texto, fotoUrl: e.fotoUrl })) ?? [],
    };
    executar(() => (preparo ? acaoAtualizarPreparo(preparo.id, input) : acaoCriarPreparo(input)));
  };

  return (
    <div className="px-5 py-4" style={{ borderTop: `1px solid ${"var(--border)"}`, background: "var(--bg)" }}>
      <div className="grid grid-cols-6 gap-2 mb-3">
        <Input placeholder="Nome da receita" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-3" />
        <Input placeholder="Rende" type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <select value={unidadeRendimento} onChange={(e) => setUnidadeRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {ficha.length > 0 && (
        <div className="mb-3 space-y-1">
          {ficha.map((f, idx) => {
            const insumo = insumoPorId.get(f.insumoId!);
            return (
              <div key={idx} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-md" style={{ background: "var(--panel)", border: `1px solid ${"var(--border)"}` }}>
                <span>
                  {insumo?.nome} · {f.pesoLiquido}
                  {f.unidade}
                </span>
                <button onClick={() => removerLinha(idx)} style={{ color: "var(--danger)" }}>
                  remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <select
          value={linhaInsumoId}
          onChange={(e) => {
            setLinhaInsumoId(e.target.value);
            setLinhaUnidade(insumoPorId.get(e.target.value)?.unidadeMedida ?? "kg");
          }}
          className="text-[12.5px] px-2.5 py-1.5 rounded-md flex-1"
          style={inputStyle}
        >
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <Input placeholder="Peso líquido" type="number" value={linhaPeso} onChange={(e) => setLinhaPeso(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 w-28" />
        <select value={linhaUnidade} onChange={(e) => setLinhaUnidade(e.target.value as UnidadeMedida)} className="text-[12.5px] px-2.5 py-1.5 rounded-md w-20" style={inputStyle}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <button onClick={addLinha} className="text-[12.5px] font-medium px-3 py-1.5 rounded-md" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          + ingrediente
        </button>
      </div>

      <ErroBanner erro={erro} />

      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--text)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : preparo ? "Salvar alterações" : "Salvar receita"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
