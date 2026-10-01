"use client";

import { useState } from "react";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { EstoqueLinha } from "@/lib/dominio/estoque";
import { acaoAtualizarEstoque, acaoPararDeRastrear } from "@/app/estoque/actions";

/** CELULAR (2026-09-26): `bloco` = dentro da lista do celular; senão, linha da tabela. */
export function EditarEstoqueForm({ linha, onCancel, onSaved, bloco = false }: { linha: EstoqueLinha; onCancel: () => void; onSaved: () => void; bloco?: boolean }) {
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

  const campos = (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-start">
        <label className="text-[12.5px] text-[var(--tinta-sub)]">
          Saldo atual ({linha.unidadeMedida})
          <Input inputMode="decimal" type="number" value={atual} onChange={(e) => setAtual(e.target.value)} className="mt-1 w-full text-[15px] md:text-[12.5px] px-2.5 min-h-11 md:min-h-0 md:py-1.5" />
        </label>
        <label className="text-[12.5px] text-[var(--tinta-sub)]">
          Estoque mínimo ({linha.unidadeMedida})
          <Input inputMode="decimal" type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="mt-1 w-full text-[15px] md:text-[12.5px] px-2.5 min-h-11 md:min-h-0 md:py-1.5" />
        </label>
        <div className="col-span-2 flex flex-wrap gap-2 md:self-end">
          <button onClick={salvar} disabled={salvando} className="text-[13px] font-medium px-4 min-h-11 md:min-h-9 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
            Salvar
          </button>
          <button onClick={onCancel} className="text-[13px] font-medium px-4 min-h-11 md:min-h-9 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
            Cancelar
          </button>
          <button onClick={pararDeRastrear} disabled={salvando} className="text-[13px] font-medium px-3 min-h-11 md:min-h-9 rounded-lg ml-auto" style={{ color: "var(--danger)" }}>
            Parar de rastrear
          </button>
        </div>
      </div>
      <ErroBanner erro={erro} className="mt-3" />
    </>
  );

  if (bloco) return <div className="rounded-lg p-3" style={{ background: "var(--bg)" }}>{campos}</div>;
  return (
    <tr>
      <td colSpan={5} className="p-0" style={{ borderTop: `1px solid ${"var(--border)"}`, background: "var(--bg)" }}>
        <div className="px-5 py-3">{campos}</div>
      </td>
    </tr>
  );
}
