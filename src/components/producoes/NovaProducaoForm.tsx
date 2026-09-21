"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Receita } from "@/lib/dominio/receita";
import type { ProducaoInput, TipoItemProducao } from "@/lib/dominio/producao";
import { acaoRegistrarProducao } from "@/app/producoes/actions";

export function NovaProducaoForm({
  preparos,
  pratos,
  turnoId,
  chefeTurno,
  onSave,
  onCancel,
}: {
  preparos: Receita[];
  pratos: Receita[];
  turnoId: string | null;
  chefeTurno: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<TipoItemProducao>("preparo");
  const [receitaId, setReceitaId] = useState(preparos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const { salvando, erro, executar } = useAcaoFormulario(onSave);

  const opcoes = tipo === "preparo" ? preparos : pratos;
  const unidade = tipo === "preparo" ? (preparos.find((p) => p.id === receitaId)?.unidadeRendimento ?? "") : "porções";

  const trocarTipo = (novoTipo: TipoItemProducao) => {
    setTipo(novoTipo);
    setReceitaId(novoTipo === "preparo" ? (preparos[0]?.id ?? "") : (pratos[0]?.id ?? ""));
  };

  const salvar = () => {
    if (!receitaId || !quantidade || !responsavel.trim() || !lote.trim()) return;
    const input: ProducaoInput = {
      lote: lote.trim(),
      tipo,
      receitaId,
      quantidade: parseFloat(quantidade),
      responsavel: responsavel.trim(),
      turnoId,
      chefeTurno: chefeTurno.trim() || null,
      validade: validade.trim() || null,
    };
    executar(() => acaoRegistrarProducao(input));
  };

  return (
    <div className="px-5 py-4">
      <div className="flex gap-2 mb-2">
        {([["preparo", "Preparo próprio"], ["prato", "Prato final"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => trocarTipo(id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: tipo === id ? "var(--text)" : "var(--panel)", color: tipo === id ? "#fff" : "var(--text)", border: `1px solid ${tipo === id ? "var(--text)" : "var(--border-strong)"}` }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={receitaId} onChange={(e) => setReceitaId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>{o.nomePrato}</option>
          ))}
        </select>
        <Input placeholder={`Quantidade${unidade ? ` (${unidade})` : ""}`} type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Input placeholder="Número do lote" value={lote} onChange={(e) => setLote(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Validade (ex: 17/09)" value={validade} onChange={(e) => setValidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
      </div>
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar produção"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
