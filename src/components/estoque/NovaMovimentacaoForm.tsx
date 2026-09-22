"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { EstoqueLinha, TipoMovimentacao } from "@/lib/dominio/estoque";
import { acaoRegistrarMovimentacao } from "@/app/estoque/actions";

export function NovaMovimentacaoForm({
  estoque,
  onCancel,
  onSaved,
  onSalvarDemo,
}: {
  estoque: EstoqueLinha[];
  onCancel: () => void;
  onSaved: () => void;
  onSalvarDemo?: (dados: { insumoId: string; tipo: TipoMovimentacao; quantidade: number; origem: string }) => void;
}) {
  const [insumoId, setInsumoId] = useState(estoque[0]?.insumoId ?? "");
  const [tipo, setTipo] = useState<Extract<TipoMovimentacao, "entrada" | "ajuste" | "saida_producao">>("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [origem, setOrigem] = useState("");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  if (estoque.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>Rastreie um insumo primeiro pra poder lançar entrada ou ajuste de estoque.</p>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>Fechar</button>
      </div>
    );
  }

  const unidade = estoque.find((e) => e.insumoId === insumoId)?.unidadeMedida ?? "";

  const salvar = () => {
    if (!insumoId || !quantidade || !origem.trim()) return;
    const qtdNum = parseFloat(quantidade);
    if (isNaN(qtdNum) || qtdNum <= 0) return;

    if (onSalvarDemo) {
      onSalvarDemo({ insumoId, tipo, quantidade: qtdNum, origem: origem.trim() });
      onSaved();
      return;
    }

    executar(() => acaoRegistrarMovimentacao(insumoId, tipo, qtdNum, origem.trim()));
  };

  return (
    <div className="px-5 py-4">
      <div className="flex gap-2 mb-2">
        {([["entrada", "Entrada"], ["ajuste", "Ajuste"], ["saida_producao", "Saída (produção)"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: tipo === id ? (id === "saida_producao" ? "#D97706" : "var(--text)") : "var(--panel)",
              color: tipo === id ? "var(--text-contrast, #fff)" : "var(--text)",
              border: `1px solid ${tipo === id ? (id === "saida_producao" ? "#D97706" : "var(--text)") : "var(--border-strong)"}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {estoque.map((e) => (
            <option key={e.insumoId} value={e.insumoId}>{e.nome}</option>
          ))}
        </select>
        <Input placeholder={`Quantidade (${unidade})`} type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder={tipo === "saida_producao" ? "Origem (ex: Produção — bancada pizza)" : "Origem (ex: compra fornecedor)"} value={origem} onChange={(e) => setOrigem(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      {tipo === "ajuste" && (
        <p className="text-[11.5px] mb-3" style={{ color: "var(--faint)" }}>Ajuste subtrai do saldo atual — serve pra registrar perda ou corrigir contagem pra baixo.</p>
      )}
      {tipo === "saida_producao" && (
        <p className="text-[11.5px] mb-3" style={{ color: "#F59E0B" }}>Saída para produção subtrai do estoque e registra a destinação de insumos para a cozinha.</p>
      )}
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Registrar movimentação"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
