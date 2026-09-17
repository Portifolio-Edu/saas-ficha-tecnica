"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import { UNIDADES, type Insumo } from "@/lib/dominio/insumo";
import type { DestinoVenda, FormaFisica, LinhaFichaInput, Receita, ReceitaInput } from "@/lib/dominio/receita";
import type { UnidadeMedida } from "@/lib/calculo/types";
import { acaoCriarReceita, acaoAtualizarReceita } from "@/app/receitas/actions";

export function ReceitaForm({
  insumos,
  preparos,
  receita,
  onCancel,
  onSaved,
}: {
  insumos: Insumo[];
  preparos: Receita[];
  receita?: Receita;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(receita?.nomePrato ?? "");
  const [categoria, setCategoria] = useState(receita?.categoria ?? "");
  const [precoVenda, setPrecoVenda] = useState(receita?.precoVenda != null ? String(receita.precoVenda) : "");
  const [vendasMes, setVendasMes] = useState(receita?.vendasMes != null ? String(receita.vendasMes) : "");
  const [rendimento, setRendimento] = useState(receita ? String(receita.rendimento) : "1");
  const [pesoPorcaoG, setPesoPorcaoG] = useState(receita?.pesoPorcaoG != null ? String(receita.pesoPorcaoG) : "");
  const [formaFisica, setFormaFisica] = useState<FormaFisica>(receita?.formaFisica ?? "solido");
  const [destinoVenda, setDestinoVenda] = useState<DestinoVenda>(receita?.destinoVenda ?? "proprio");
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo ?? "");
  const [ficha, setFicha] = useState<LinhaFichaInput[]>(receita?.ficha.map((f) => ({ ...f })) ?? []);
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const [tipoLinha, setTipoLinha] = useState<"insumo" | "sub_receita">("insumo");
  const [linhaRefId, setLinhaRefId] = useState(insumos[0]?.id ?? "");
  const [linhaPeso, setLinhaPeso] = useState("");
  const [linhaUnidade, setLinhaUnidade] = useState<UnidadeMedida>(insumos[0]?.unidadeMedida ?? "kg");

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));
  const opcoesLinha = tipoLinha === "insumo" ? insumos.map((i) => ({ id: i.id, nome: i.nome })) : preparos.map((p) => ({ id: p.id, nome: p.nomePrato }));

  const trocarTipoLinha = (t: "insumo" | "sub_receita") => {
    setTipoLinha(t);
    setLinhaRefId(t === "insumo" ? insumos[0]?.id ?? "" : preparos[0]?.id ?? "");
  };

  const addLinha = () => {
    if (!linhaRefId || !linhaPeso) return;
    setFicha([
      ...ficha,
      tipoLinha === "insumo"
        ? { insumoId: linhaRefId, subReceitaId: null, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade }
        : { insumoId: null, subReceitaId: linhaRefId, pesoLiquido: parseFloat(linhaPeso), unidade: linhaUnidade },
    ]);
    setLinhaPeso("");
  };
  const removerLinha = (idx: number) => setFicha(ficha.filter((_, i) => i !== idx));

  const salvar = () => {
    if (!nome.trim() || !precoVenda || !rendimento || ficha.length === 0) return;
    const input: ReceitaInput = {
      nomePrato: nome.trim(),
      tipo: "prato_final",
      categoria: categoria.trim() || null,
      precoVenda: parseFloat(precoVenda),
      vendasMes: vendasMes ? parseInt(vendasMes, 10) : null,
      rendimento: parseFloat(rendimento),
      unidadeRendimento: "porção",
      pesoPorcaoG: pesoPorcaoG ? parseFloat(pesoPorcaoG) : null,
      formaFisica,
      destinoVenda,
      margemAlvo: null,
      modoPreparo: modoPreparo.trim() || null,
      ficha,
    };
    executar(() => (receita ? acaoAtualizarReceita(receita.id, input) : acaoCriarReceita(input)));
  };

  return (
    <div className="px-5 py-4" style={{ borderTop: `1px solid ${"var(--border)"}`, background: "var(--bg)" }}>
      <div className="grid grid-cols-6 gap-2 mb-2">
        <Input placeholder="Nome do prato" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Categoria (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Preço de venda (R$)" type="number" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Rende (porções)" type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="grid grid-cols-8 gap-2 mb-3">
        <Input placeholder="Peso da porção (g, opcional)" type="number" value={pesoPorcaoG} onChange={(e) => setPesoPorcaoG(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Vendas/mês (manual, opcional)" type="number" value={vendasMes} onChange={(e) => setVendasMes(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <select value={formaFisica} onChange={(e) => setFormaFisica(e.target.value as FormaFisica)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          <option value="solido">Sólido</option>
          <option value="liquido">Líquido</option>
        </select>
        <select value={destinoVenda} onChange={(e) => setDestinoVenda(e.target.value as DestinoVenda)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          <option value="proprio">Próprio estabelecimento</option>
          <option value="varejo_terceiro">Varejo/mercado de terceiro</option>
        </select>
      </div>

      {ficha.length > 0 && (
        <div className="mb-3 space-y-1">
          {ficha.map((f, idx) => {
            const label = f.insumoId ? insumoPorId.get(f.insumoId)?.nome : preparoPorId.get(f.subReceitaId!)?.nomePrato;
            return (
              <div key={idx} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-md" style={{ background: "var(--panel)", border: `1px solid ${"var(--border)"}` }}>
                <span>
                  {label} · {f.pesoLiquido}{f.unidade}
                  {f.subReceitaId && <span style={{ color: "var(--faint)" }}> · preparo próprio</span>}
                </span>
                <button onClick={() => removerLinha(idx)} style={{ color: "var(--danger)" }}>
                  remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        {(["insumo", "sub_receita"] as const).map((t) => (
          <button
            key={t}
            onClick={() => trocarTipoLinha(t)}
            className="text-[12px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: tipoLinha === t ? "var(--text)" : "var(--panel)", color: tipoLinha === t ? "#fff" : "var(--text)", border: `1px solid ${tipoLinha === t ? "var(--text)" : "var(--border-strong)"}` }}
          >
            {t === "insumo" ? "Insumo" : "Preparo próprio"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <select
          value={linhaRefId}
          onChange={(e) => {
            setLinhaRefId(e.target.value);
            if (tipoLinha === "insumo") setLinhaUnidade(insumoPorId.get(e.target.value)?.unidadeMedida ?? "kg");
          }}
          className="text-[12.5px] px-2.5 py-1.5 rounded-md flex-1"
          style={inputStyle}
        >
          {opcoesLinha.length === 0 && <option value="">Nada cadastrado</option>}
          {opcoesLinha.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
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

      <textarea
        placeholder="Modo de preparo (opcional -- vai pra ficha operacional da cozinha, não pra ficha de custos)"
        value={modoPreparo}
        onChange={(e) => setModoPreparo(e.target.value)}
        className="text-[12.5px] px-2.5 py-2 rounded-md w-full mb-3"
        style={{ ...inputStyle, minHeight: 80 }}
      />

      <ErroBanner erro={erro} />

      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--text)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : receita ? "Salvar alterações" : "Salvar prato"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
