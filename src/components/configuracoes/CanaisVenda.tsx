"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ficha/Badge";
import { formatNumero } from "@/components/charts/format";
import { CANAIS_SUGERIDOS, fracaoParaPct, type CanalVendaConfig } from "@/lib/dominio/configuracoes";
import { BotaoPrimario, BotaoSecundario, Campo, CampoTexto, MensagemErro, SecaoConfig } from "./campos";
import type { AcoesConfiguracoes } from "./tipos";

// CONFIGURAÇÕES (2026-10-03): canais de venda com comissão e embalagem. O
// balcão é a base (o preço do prato); cada canal daqui vira um preço sugerido
// na ficha, que mantém o mesmo ganho em reais do balcão
// (calcularPrecoPorCanal). A comissão é do contrato de cada restaurante: os
// nomes sugeridos criam o canal sem comissão preenchida.

const pctTexto = (fracao: number) => formatNumero(fracaoParaPct(fracao), fracaoParaPct(fracao) % 1 === 0 ? 0 : 1);

interface Rascunho {
  id: string | null;
  nomeCanal: string;
  comissaoPct: string;
  embala: boolean;
  ativo: boolean;
}

const VAZIO: Rascunho = { id: null, nomeCanal: "", comissaoPct: "", embala: true, ativo: true };

export function CanaisVenda({ canais, acoes }: { canais: CanalVendaConfig[]; acoes: AcoesConfiguracoes }) {
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const abrirNovo = (base: Partial<Rascunho> = {}) => {
    setErro(null);
    setRascunho({ ...VAZIO, ...base });
  };

  const abrirEdicao = (c: CanalVendaConfig) => {
    setErro(null);
    setRascunho({ id: c.id, nomeCanal: c.nomeCanal, comissaoPct: pctTexto(c.comissaoPercentual), embala: c.embala, ativo: c.ativo });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rascunho) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await acoes.salvarCanal(rascunho.id, { nomeCanal: rascunho.nomeCanal, comissaoPct: rascunho.comissaoPct, embala: rascunho.embala, ativo: rascunho.ativo });
      if (!r.ok) setErro(r.erro);
      else setRascunho(null);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: CanalVendaConfig) => {
    if (!window.confirm(`Excluir o canal "${c.nomeCanal}"? Os preços calculados pra ele deixam de aparecer nas fichas.`)) return;
    setErroLista(null);
    const r = await acoes.excluirCanal(c.id);
    if (!r.ok) setErroLista(r.erro);
  };

  const sugestoesLivres = CANAIS_SUGERIDOS.filter((s) => !canais.some((c) => c.nomeCanal.trim().toLocaleLowerCase("pt-BR") === s.nome.toLocaleLowerCase("pt-BR")));

  return (
    <SecaoConfig
      titulo="Canais de venda"
      descricao="O preço do prato é o do balcão. Cada canal abaixo ganha um preço sugerido na ficha, que mantém o mesmo ganho em reais do balcão depois da comissão."
      acao={
        !rascunho && (
          <BotaoSecundario onClick={() => abrirNovo()}>
            <Plus size={15} /> Novo canal
          </BotaoSecundario>
        )
      }
    >
      {canais.length === 0 && !rascunho && (
        <div className="px-5 py-6">
          <p className="text-[14px] text-[var(--tinta-sub)]">Nenhum canal cadastrado. Sem canal, as fichas mostram só o preço do balcão.</p>
        </div>
      )}

      {canais.length > 0 && (
        <ul className="divide-y" style={{ borderColor: "var(--linha)" }} aria-label="Canais de venda">
          {canais.map((c) => (
            <li key={c.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ opacity: c.ativo ? 1 : 0.65 }}>
              <div className="min-w-0 flex-1 basis-48">
                <div className="text-[15px] font-medium text-[var(--tinta)]">{c.nomeCanal}</div>
                <div className="text-[13px] text-[var(--tinta-sub)] mt-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                  Comissão {pctTexto(c.comissaoPercentual)}% · {c.embala ? "inclui a embalagem no preço" : "sem embalagem"}
                </div>
              </div>
              {!c.ativo && <Badge>desativado</Badge>}
              <div className="flex items-center gap-2">
                <BotaoSecundario onClick={() => abrirEdicao(c)} ariaLabel={`Editar ${c.nomeCanal}`}>
                  <Pencil size={14} /> Editar
                </BotaoSecundario>
                <BotaoSecundario onClick={() => excluir(c)} destrutivo ariaLabel={`Excluir ${c.nomeCanal}`}>
                  <Trash2 size={14} />
                </BotaoSecundario>
              </div>
            </li>
          ))}
        </ul>
      )}

      {erroLista && (
        <div className="px-5 pb-4">
          <MensagemErro erro={erroLista} />
        </div>
      )}

      {!rascunho && sugestoesLivres.length > 0 && (
        <div className="px-5 py-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: "var(--linha)" }}>
          <span className="text-[13px] text-[var(--tinta-sub)] mr-1">Começar por:</span>
          {sugestoesLivres.map((s) => (
            <button
              key={s.nome}
              type="button"
              onClick={() => abrirNovo({ nomeCanal: s.nome, embala: s.embala })}
              className="min-h-10 px-3 rounded-lg border text-[13px] font-medium hover:bg-[var(--panel-hover)]"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
            >
              {s.nome}
            </button>
          ))}
        </div>
      )}

      {rascunho && (
        <form onSubmit={salvar} className="px-5 py-5 border-t space-y-4" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
          <h3 className="text-[14px] font-semibold text-[var(--tinta)]">{rascunho.id ? "Editar canal" : "Novo canal"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <Campo rotulo="Nome do canal" htmlFor="cfg-canal-nome">
              <CampoTexto id="cfg-canal-nome" value={rascunho.nomeCanal} onChange={(e) => setRascunho({ ...rascunho, nomeCanal: e.target.value })} placeholder="iFood" autoFocus />
            </Campo>
            <Campo rotulo="Comissão (%)" htmlFor="cfg-canal-comissao" ajuda="A do seu contrato com o canal. Sem comissão, digite 0.">
              <CampoTexto id="cfg-canal-comissao" inputMode="decimal" value={rascunho.comissaoPct} onChange={(e) => setRascunho({ ...rascunho, comissaoPct: e.target.value })} placeholder="12" style={{ fontVariantNumeric: "tabular-nums" }} />
            </Campo>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 min-h-11 text-[14px] text-[var(--tinta)] cursor-pointer">
              <input type="checkbox" className="w-5 h-5" style={{ accentColor: "var(--marca)" }} checked={rascunho.embala} onChange={(e) => setRascunho({ ...rascunho, embala: e.target.checked })} />
              Este canal leva embalagem (delivery e viagem)
            </label>
            <label className="flex items-center gap-3 min-h-11 text-[14px] text-[var(--tinta)] cursor-pointer">
              <input type="checkbox" className="w-5 h-5" style={{ accentColor: "var(--marca)" }} checked={rascunho.ativo} onChange={(e) => setRascunho({ ...rascunho, ativo: e.target.checked })} />
              Canal ativo (aparece no preço por canal das fichas)
            </label>
          </div>
          <MensagemErro erro={erro} />
          <div className="flex flex-wrap items-center gap-2">
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : rascunho.id ? "Salvar canal" : "Adicionar canal"}
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setRascunho(null)} disabled={salvando}>
              Cancelar
            </BotaoSecundario>
          </div>
        </form>
      )}
    </SecaoConfig>
  );
}
