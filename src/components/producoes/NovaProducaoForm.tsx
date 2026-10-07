"use client";

import { useState, type ReactNode } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Receita } from "@/lib/dominio/receita";
import type { ProducaoInput, TipoItemProducao } from "@/lib/dominio/producao";
import { acaoRegistrarProducao } from "@/app/producoes/actions";

// POLIMENTO fichas-kanban (2026-10-06): rótulos permanentes e controles de
// 44px no registro; mantém validação e ações existentes. Grupo 03 da documentação.
function CampoProducao({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 text-[12px] min-w-0" style={{ color: "var(--sub)" }}><span>{rotulo}</span>{children}</label>;
}

export function NovaProducaoForm({
  preparos,
  pratos,
  turnoId,
  chefeTurno,
  onSave,
  onCancel,
  onSalvarDemo,
}: {
  preparos: Receita[];
  pratos: Receita[];
  turnoId: string | null;
  chefeTurno: string;
  onSave: () => void;
  onCancel: () => void;
  onSalvarDemo?: (input: ProducaoInput) => void;
}) {
  const [tipo, setTipo] = useState<TipoItemProducao>("preparo");
  const [receitaId, setReceitaId] = useState(preparos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const { salvando, erro, executar } = useAcaoFormulario(onSave);
  // PRODUÇÃO (2026-09-26): antes, faltando campo, o botão não fazia nada e
  // parecia que tinha salvado. Agora diz o que falta.
  const [faltando, setFaltando] = useState<string | null>(null);

  const opcoes = tipo === "preparo" ? preparos : pratos;
  const unidade = tipo === "preparo" ? (preparos.find((p) => p.id === receitaId)?.unidadeRendimento ?? "") : "porções";

  const trocarTipo = (novoTipo: TipoItemProducao) => {
    setTipo(novoTipo);
    setReceitaId(novoTipo === "preparo" ? (preparos[0]?.id ?? "") : (pratos[0]?.id ?? ""));
  };

  const salvar = () => {
    const faltam = [
      !receitaId && "a ficha",
      !(parseFloat(quantidade) > 0) && "a quantidade",
      !responsavel.trim() && "o responsável",
      !lote.trim() && "o número do lote",
    ].filter(Boolean) as string[];
    if (faltam.length) {
      setFaltando(`Falta preencher ${faltam.length === 1 ? faltam[0] : `${faltam.slice(0, -1).join(", ")} e ${faltam.at(-1)}`}.`);
      return;
    }
    setFaltando(null);
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
    if (onSalvarDemo) {
      onSalvarDemo(input);
      return;
    }
    executar(() => acaoRegistrarProducao(input));
  };

  return (
    <div className="px-5 py-4">
      <div className="flex gap-2 mb-4" role="group" aria-label="Tipo da produção">
        {([["preparo", "Preparo próprio"], ["prato", "Prato final"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => trocarTipo(id)}
            aria-pressed={tipo === id}
            className="text-[14px] font-medium px-3 min-h-11 rounded-lg"
            style={{ background: tipo === id ? "var(--text)" : "var(--panel)", color: tipo === id ? "var(--text-contrast, #fff)" : "var(--text)", border: `1px solid ${tipo === id ? "var(--text)" : "var(--border-strong)"}` }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <CampoProducao rotulo="Ficha"><select value={receitaId} onChange={(e) => setReceitaId(e.target.value)} className="text-[14px] px-3 min-h-11 rounded-lg w-full" style={inputStyle}>{opcoes.map((o) => <option key={o.id} value={o.id}>{o.nomePrato}</option>)}</select></CampoProducao>
        <CampoProducao rotulo={`Quantidade${unidade ? ` (${unidade})` : ""}`}><Input type="number" min="0" step="any" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="text-[14px] px-3 min-h-11 w-full" /></CampoProducao>
        <CampoProducao rotulo="Responsável"><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[14px] px-3 min-h-11 w-full" /></CampoProducao>
        <CampoProducao rotulo="Número do lote"><Input value={lote} onChange={(e) => setLote(e.target.value)} className="text-[14px] px-3 min-h-11 w-full" /></CampoProducao>
        <CampoProducao rotulo="Validade (opcional)"><Input placeholder="Ex.: 17/09 ou 7 dias" value={validade} onChange={(e) => setValidade(e.target.value)} className="text-[14px] px-3 min-h-11 w-full" /></CampoProducao>
      </div>
      <ErroBanner erro={faltando ?? erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[14px] font-medium px-3.5 min-h-11 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar produção"}
        </button>
        <button onClick={onCancel} className="text-[14px] font-medium px-3.5 min-h-11 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
