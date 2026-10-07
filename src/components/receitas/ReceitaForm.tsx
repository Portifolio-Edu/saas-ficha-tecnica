"use client";

// POLIMENTO fichas-kanban (2026-10-06): campos com rótulos permanentes,
// validação visível e edição de quantidade/unidade na linha. Antes era
// remover/adicionar e alguns cadastros inválidos não davam retorno.
// Antes/depois e reversão: docs/MELHORIAS_FICHAS_KANBAN.md, grupo 1.
import { useId, useRef, useState, type ReactNode } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { UploadFoto } from "@/components/receitas/UploadFoto";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import { UNIDADES, type Insumo } from "@/lib/dominio/insumo";
import type {
  DestinoVenda,
  EtapaReceitaInput,
  FormaFisica,
  Receita,
  ReceitaInput,
} from "@/lib/dominio/receita";
import type { UnidadeMedida } from "@/lib/calculo/types";
import { acaoCriarReceita, acaoAtualizarReceita } from "@/app/receitas/actions";
import {
  numeroDoCampo,
  validarCamposReceita,
  type LinhaEdicao,
} from "./formulario";

const controle = "text-[14px] px-3 min-h-11 w-full";
const botao = "text-[14px] font-medium px-3.5 min-h-11 rounded-lg";

function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[12px] font-medium" style={{ color: "var(--sub)" }}>
        {rotulo}
      </span>
      {children}
      {erro && (
        <span className="text-[13px]" style={{ color: "var(--danger)" }}>
          {erro}
        </span>
      )}
    </label>
  );
}

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
  const [precoVenda, setPrecoVenda] = useState(
    receita?.precoVenda != null ? String(receita.precoVenda) : "",
  );
  const [vendasMes, setVendasMes] = useState(
    receita?.vendasMes != null ? String(receita.vendasMes) : "",
  );
  const [rendimento, setRendimento] = useState(
    receita ? String(receita.rendimento) : "1",
  );
  const [pesoPorcaoG, setPesoPorcaoG] = useState(
    receita?.pesoPorcaoG != null ? String(receita.pesoPorcaoG) : "",
  );
  const [formaFisica, setFormaFisica] = useState<FormaFisica>(
    receita?.formaFisica ?? "solido",
  );
  const [destinoVenda, setDestinoVenda] = useState<DestinoVenda>(
    receita?.destinoVenda ?? "proprio",
  );
  const [modoPreparo, setModoPreparo] = useState(receita?.modoPreparo ?? "");
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    receita?.fotoUrl ?? null,
  );
  const [ficha, setFicha] = useState<LinhaEdicao[]>(
    receita?.ficha.map((f) => ({
      insumoId: f.insumoId,
      subReceitaId: f.subReceitaId,
      unidade: f.unidade,
      quantidade: String(f.pesoLiquido),
    })) ?? [],
  );
  const [etapas, setEtapas] = useState<EtapaReceitaInput[]>(
    receita?.etapas.map((e) => ({ ...e })) ?? [],
  );
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const id = useId();
  const erros = tentouSalvar
    ? validarCamposReceita({
        nome,
        precoVenda,
        rendimento,
        pesoPorcaoG,
        vendasMes,
        ficha,
      })
    : {};
  const [tipoLinha, setTipoLinha] = useState<"insumo" | "sub_receita">(
    "insumo",
  );
  const [linhaRefId, setLinhaRefId] = useState(insumos[0]?.id ?? "");
  const [linhaPeso, setLinhaPeso] = useState("");
  const [linhaUnidade, setLinhaUnidade] = useState<UnidadeMedida>(
    insumos[0]?.unidadeMedida ?? "kg",
  );
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const preparoPorId = new Map(preparos.map((p) => [p.id, p]));
  const opcoesLinha =
    tipoLinha === "insumo"
      ? insumos.map((i) => ({ id: i.id, nome: i.nome }))
      : preparos.map((p) => ({ id: p.id, nome: p.nomePrato }));

  const trocarTipoLinha = (t: "insumo" | "sub_receita") => {
    const primeiro = t === "insumo" ? insumos[0] : preparos[0];
    setTipoLinha(t);
    setLinhaRefId(primeiro?.id ?? "");
    setLinhaUnidade(
      t === "insumo" ? (insumos[0]?.unidadeMedida ?? "kg") : "un",
    );
    setErroLinha(null);
  };
  const addLinha = () => {
    const quantidade = numeroDoCampo(linhaPeso);
    if (!linhaRefId)
      return setErroLinha("Escolha um ingrediente ou preparo próprio.");
    if (!Number.isFinite(quantidade) || quantidade <= 0)
      return setErroLinha(
        "Informe uma quantidade maior que zero para adicionar.",
      );
    setFicha([
      ...ficha,
      {
        insumoId: tipoLinha === "insumo" ? linhaRefId : null,
        subReceitaId: tipoLinha === "sub_receita" ? linhaRefId : null,
        quantidade: String(quantidade),
        unidade: linhaUnidade,
      },
    ]);
    setLinhaPeso("");
    setErroLinha(null);
  };
  const atualizarLinha = (idx: number, parcial: Partial<LinhaEdicao>) =>
    setFicha(ficha.map((f, i) => (i === idx ? { ...f, ...parcial } : f)));
  const addEtapa = () =>
    setEtapas([
      ...etapas,
      { ordem: etapas.length + 1, titulo: null, texto: null, fotoUrl: null },
    ]);
  const atualizarEtapa = (idx: number, parcial: Partial<EtapaReceitaInput>) =>
    setEtapas(etapas.map((e, i) => (i === idx ? { ...e, ...parcial } : e)));

  const salvar = () => {
    setTentouSalvar(true);
    const problemas = validarCamposReceita({
      nome,
      precoVenda,
      rendimento,
      pesoPorcaoG,
      vendasMes,
      ficha,
    });
    if (Object.keys(problemas).length) {
      requestAnimationFrame(() =>
        formulario.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    const input: ReceitaInput = {
      nomePrato: nome.trim(),
      tipo: "prato_final",
      categoria: categoria.trim() || null,
      precoVenda: numeroDoCampo(precoVenda),
      vendasMes: vendasMes.trim() ? numeroDoCampo(vendasMes) : null,
      rendimento: numeroDoCampo(rendimento),
      unidadeRendimento: receita?.unidadeRendimento ?? "porção",
      pesoPorcaoG: pesoPorcaoG.trim() ? numeroDoCampo(pesoPorcaoG) : null,
      formaFisica,
      destinoVenda,
      // Editar quantidades não pode apagar a meta individual já cadastrada.
      margemAlvo: receita?.margemAlvo ?? null,
      modoPreparo: modoPreparo.trim() || null,
      fotoUrl,
      ficha: ficha.map((f) => ({
        insumoId: f.insumoId,
        subReceitaId: f.subReceitaId,
        unidade: f.unidade,
        pesoLiquido: numeroDoCampo(f.quantidade),
      })),
      etapas: etapas.map((e, idx) => ({ ...e, ordem: idx + 1 })),
    };
    void executar(() =>
      receita
        ? acaoAtualizarReceita(receita.id, input)
        : acaoCriarReceita(input),
    );
  };

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
      className="px-4 md:px-5 py-5 space-y-5"
      style={{ background: "var(--bg)" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <Campo rotulo="Nome do prato" erro={erros.nome}>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={!!erros.nome}
              className={controle}
            />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo rotulo="Categoria (opcional)">
            <Input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={controle}
            />
          </Campo>
        </div>
        <Campo rotulo="Preço de venda (R$)" erro={erros.precoVenda}>
          <Input
            inputMode="decimal"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            aria-invalid={!!erros.precoVenda}
            className={controle}
          />
        </Campo>
        <Campo rotulo="Rende (porções)" erro={erros.rendimento}>
          <Input
            inputMode="decimal"
            value={rendimento}
            onChange={(e) => setRendimento(e.target.value)}
            aria-invalid={!!erros.rendimento}
            className={controle}
          />
        </Campo>
        <Campo rotulo="Peso da porção (g, opcional)" erro={erros.pesoPorcaoG}>
          <Input
            inputMode="decimal"
            value={pesoPorcaoG}
            onChange={(e) => setPesoPorcaoG(e.target.value)}
            aria-invalid={!!erros.pesoPorcaoG}
            className={controle}
          />
        </Campo>
        <Campo rotulo="Vendas/mês (manual, opcional)" erro={erros.vendasMes}>
          <Input
            inputMode="numeric"
            value={vendasMes}
            onChange={(e) => setVendasMes(e.target.value)}
            aria-invalid={!!erros.vendasMes}
            className={controle}
          />
        </Campo>
        <Campo rotulo="Forma física">
          <select
            value={formaFisica}
            onChange={(e) => setFormaFisica(e.target.value as FormaFisica)}
            className={`${controle} rounded-lg`}
            style={inputStyle}
          >
            <option value="solido">Sólido</option>
            <option value="liquido">Líquido</option>
          </select>
        </Campo>
        <div className="lg:col-span-3">
          <Campo rotulo="Onde é vendido">
            <select
              value={destinoVenda}
              onChange={(e) => setDestinoVenda(e.target.value as DestinoVenda)}
              className={`${controle} rounded-lg`}
              style={inputStyle}
            >
              <option value="proprio">Próprio estabelecimento</option>
              <option value="varejo_terceiro">
                Varejo/mercado de terceiro
              </option>
            </select>
          </Campo>
        </div>
      </div>

      <section aria-labelledby={`${id}-ingredientes`}>
        <h4
          id={`${id}-ingredientes`}
          className="text-[16px] font-semibold mb-3"
        >
          Ingredientes e preparos
        </h4>
        {ficha.length > 0 && (
          <div className="space-y-3 mb-4">
            {ficha.map((f, idx) => {
              const nomeItem =
                (f.insumoId
                  ? insumoPorId.get(f.insumoId)?.nome
                  : preparoPorId.get(f.subReceitaId!)?.nomePrato) ??
                "Item removido";
              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_88px_auto] gap-3 items-start rounded-lg p-3 border"
                  style={{
                    background: "var(--panel)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="sm:pt-6 min-w-0">
                    <p className="text-[14px] font-medium">{nomeItem}</p>
                    {f.subReceitaId && (
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--sub)" }}
                      >
                        preparo próprio
                      </span>
                    )}
                  </div>
                  <Campo rotulo="Quantidade" erro={erros[`linha-${idx}`]}>
                    <Input
                      aria-label={`Quantidade de ${nomeItem}`}
                      inputMode="decimal"
                      value={f.quantidade}
                      onChange={(e) =>
                        atualizarLinha(idx, { quantidade: e.target.value })
                      }
                      aria-invalid={!!erros[`linha-${idx}`]}
                      className={controle}
                    />
                  </Campo>
                  <Campo rotulo="Unidade">
                    <select
                      aria-label={`Unidade de ${nomeItem}`}
                      value={f.unidade}
                      onChange={(e) =>
                        atualizarLinha(idx, {
                          unidade: e.target.value as UnidadeMedida,
                        })
                      }
                      className={`${controle} rounded-lg`}
                      style={inputStyle}
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <button
                    type="button"
                    onClick={() => setFicha(ficha.filter((_, i) => i !== idx))}
                    aria-label={`Remover ${nomeItem} da ficha`}
                    className={`${botao} sm:mt-6`}
                    style={{ color: "var(--danger)" }}
                  >
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {erros.ficha && (
          <p className="text-[13px] mb-3" style={{ color: "var(--danger)" }}>
            {erros.ficha}
          </p>
        )}
        <div
          className="flex flex-wrap gap-2 mb-3"
          role="group"
          aria-label="Tipo de ingrediente"
        >
          {(["insumo", "sub_receita"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => trocarTipoLinha(t)}
              aria-pressed={tipoLinha === t}
              className={botao}
              style={{
                background: tipoLinha === t ? "var(--text)" : "var(--panel)",
                color:
                  tipoLinha === t
                    ? "var(--text-contrast, #fff)"
                    : "var(--text)",
                border: "1px solid var(--border-strong)",
              }}
            >
              {t === "insumo" ? "Insumo" : "Preparo próprio"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_88px_auto] gap-3 items-end">
          <Campo rotulo="Ingrediente">
            <select
              value={linhaRefId}
              onChange={(e) => {
                setLinhaRefId(e.target.value);
                if (tipoLinha === "insumo")
                  setLinhaUnidade(
                    insumoPorId.get(e.target.value)?.unidadeMedida ?? "kg",
                  );
                setErroLinha(null);
              }}
              className={`${controle} rounded-lg`}
              style={inputStyle}
            >
              {!opcoesLinha.length && <option value="">Nada cadastrado</option>}
              {opcoesLinha.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Peso líquido">
            <Input
              inputMode="decimal"
              value={linhaPeso}
              onChange={(e) => {
                setLinhaPeso(e.target.value);
                setErroLinha(null);
              }}
              className={controle}
            />
          </Campo>
          <Campo rotulo="Unidade">
            <select
              value={linhaUnidade}
              onChange={(e) => setLinhaUnidade(e.target.value as UnidadeMedida)}
              className={`${controle} rounded-lg`}
              style={inputStyle}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
          <button
            type="button"
            onClick={addLinha}
            className={`${botao} border`}
            style={{ borderColor: "var(--border-strong)" }}
          >
            + Ingrediente
          </button>
        </div>
        {erroLinha && (
          <p
            role="alert"
            className="text-[13px] mt-2"
            style={{ color: "var(--danger)" }}
          >
            {erroLinha}
          </p>
        )}
      </section>

      <Campo rotulo="Modo de preparo (opcional)">
        <textarea
          value={modoPreparo}
          onChange={(e) => setModoPreparo(e.target.value)}
          className="text-[14px] px-3 py-2.5 rounded-lg w-full min-h-24"
          style={inputStyle}
        />
      </Campo>
      <p className="text-[13px] !mt-2" style={{ color: "var(--sub)" }}>
        O modo de preparo aparece na ficha operacional da cozinha.
      </p>
      <section aria-labelledby={`${id}-foto`}>
        <h4 id={`${id}-foto`} className="text-[16px] font-semibold mb-3">
          Foto de padronização do prato
        </h4>
        <UploadFoto valor={fotoUrl} onChange={setFotoUrl} alturaPreview={120} />
      </section>
      <section aria-labelledby={`${id}-etapas`}>
        <h4 id={`${id}-etapas`} className="text-[16px] font-semibold mb-3">
          Etapas de produção
        </h4>
        <div className="space-y-3 mb-3">
          {etapas.map((etapa, idx) => (
            <div
              key={idx}
              className="rounded-lg p-4 border"
              style={{
                background: "var(--panel)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between items-center gap-3 mb-3">
                <span className="text-[14px] font-semibold">
                  Etapa {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setEtapas(etapas.filter((_, i) => i !== idx))}
                  aria-label={`Remover etapa ${idx + 1}`}
                  className={botao}
                  style={{ color: "var(--danger)" }}
                >
                  Remover
                </button>
              </div>
              <div className="space-y-3">
                <Campo rotulo={`Título da etapa ${idx + 1} (opcional)`}>
                  <Input
                    value={etapa.titulo ?? ""}
                    onChange={(e) =>
                      atualizarEtapa(idx, { titulo: e.target.value || null })
                    }
                    className={controle}
                  />
                </Campo>
                <Campo rotulo={`Descrição da etapa ${idx + 1}`}>
                  <textarea
                    value={etapa.texto ?? ""}
                    onChange={(e) =>
                      atualizarEtapa(idx, { texto: e.target.value || null })
                    }
                    className="text-[14px] px-3 py-2.5 rounded-lg w-full min-h-20"
                    style={inputStyle}
                  />
                </Campo>
                <UploadFoto
                  rotulo={`Foto da etapa ${idx + 1}`}
                  valor={etapa.fotoUrl}
                  onChange={(url) => atualizarEtapa(idx, { fotoUrl: url })}
                  alturaPreview={90}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEtapa}
          className={`${botao} border`}
          style={{ borderColor: "var(--border-strong)" }}
        >
          + Etapa
        </button>
      </section>
      {Object.keys(erros).length > 0 && (
        <p
          role="alert"
          className="text-[14px]"
          style={{ color: "var(--danger)" }}
        >
          Confira os campos indicados antes de salvar.
        </p>
      )}
      <ErroBanner erro={erro} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={salvando}
          className={botao}
          style={{
            background: "var(--accent)",
            color: "var(--accent-contrast, #fff)",
            opacity: salvando ? 0.6 : 1,
          }}
        >
          {salvando
            ? "Salvando..."
            : receita
              ? "Salvar alterações"
              : "Salvar prato"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${botao} border`}
          style={{ borderColor: "var(--border-strong)" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
