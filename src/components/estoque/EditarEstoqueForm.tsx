"use client";

import { useState } from "react";
import { C } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { EstoqueLinha } from "@/lib/dominio/estoque";
import { acaoAtualizarEstoque, acaoPararDeRastrear } from "@/app/estoque/actions";

export function EditarEstoqueForm({ linha, onCancel, onSaved }: { linha: EstoqueLinha; onCancel: () => void; onSaved: () => void }) {
  const [atual, setAtual] = useState(String(linha.saldoAtual));
  const [minimo, setMinimo] = useState(String(linha.estoqueMinimo));
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const salvar = () => {
    if (atual === "" || minimo === "") return;
    executar(() => acaoAtualizarEstoque(linha.insumoId, parseFloat(atual), parseFloat(minimo)));
  };

  const pararDeRastrear = () => {
    if (!window.confirm(`Parar de rastrear "${linha.nome}"? O histórico de movimentações não é apagado.`)) return;
    executar(() => acaoPararDeRastrear(linha.insumoId));
  };

  return (
    <tr>
      <td colSpan={5} className="p-0" style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
        <div className="px-5 py-3 grid grid-cols-4 gap-2 items-start">
          <Input placeholder={`Saldo atual (${linha.unidadeMedida})`} type="number" value={atual} onChange={(e) => setAtual(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
          <Input placeholder={`Estoque mínimo (${linha.unidadeMedida})`} type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
          <div className="col-span-2 flex gap-2">
            <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
              Salvar
            </button>
            <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
              Cancelar
            </button>
            <button onClick={pararDeRastrear} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg ml-auto" style={{ color: C.danger }}>
              Parar de rastrear
            </button>
          </div>
        </div>
        <ErroBanner erro={erro} className="mx-5 mb-3" />
      </td>
    </tr>
  );
}
