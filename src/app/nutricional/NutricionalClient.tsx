"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { NutricionalOverride, Rotulagem, ValoresNutricionaisInsumo } from "@/lib/dominio/nutricional";
import { pesoBrutoDaLinha } from "@/lib/dados/adaptadores";
import {
  CAMPOS_NUTRICIONAIS,
  calcularNutricionalPor100g,
  calcularNutricionalPorPorcao,
  calcularPercentualVD,
  nutrientesComSeloFrontal,
  aplicarOverride,
  type CampoNutricional,
  type LinhaNutricional,
  type ValoresNutricionais,
} from "@/lib/calculo/nutricional";
import { acaoSalvarValoresInsumo, acaoSalvarOverride, acaoRemoverOverride, acaoSalvarRotulagem } from "./actions";

const LABEL_CAMPO: Record<CampoNutricional, string> = {
  caloriasKcal: "Energia (kcal)",
  carboidratosG: "Carboidratos (g)",
  acucaresTotaisG: "Açúcares totais (g)",
  acucaresAdicionadosG: "Açúcares adic. (g)",
  proteinasG: "Proteínas (g)",
  gordurasTotaisG: "Gorduras totais (g)",
  gordurasSaturadasG: "Saturadas (g)",
  gordurasTransG: "Trans (g)",
  fibraAlimentarG: "Fibra (g)",
  sodioMg: "Sódio (mg)",
};

const LABEL_SELO: Partial<Record<CampoNutricional, string>> = {
  gordurasSaturadasG: "gordura saturada",
  sodioMg: "sódio",
  acucaresAdicionadosG: "açúcar adicionado",
};

const LINHAS_TABELA: { label: string; campo: CampoNutricional; un: string; vd: boolean; kj?: boolean }[] = [
  { label: "Valor energético", campo: "caloriasKcal", un: "kcal", vd: true, kj: true },
  { label: "Carboidratos", campo: "carboidratosG", un: "g", vd: true },
  { label: "   açúcares totais", campo: "acucaresTotaisG", un: "g", vd: false },
  { label: "   açúcares adicionados", campo: "acucaresAdicionadosG", un: "g", vd: true },
  { label: "Proteínas", campo: "proteinasG", un: "g", vd: true },
  { label: "Gorduras totais", campo: "gordurasTotaisG", un: "g", vd: true },
  { label: "   das quais saturadas", campo: "gordurasSaturadasG", un: "g", vd: true },
  { label: "   das quais trans", campo: "gordurasTransG", un: "g", vd: true },
  { label: "Fibra alimentar", campo: "fibraAlimentarG", un: "g", vd: true },
  { label: "Sódio", campo: "sodioMg", un: "mg", vd: true },
];

function zerado(): ValoresNutricionais {
  return Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, 0])) as ValoresNutricionais;
}

/** Peso bruto (já convertido e com FC aplicado por pesoBrutoDaLinha, na
 * unidade_medida do próprio insumo) expresso em gramas -- base que a tabela
 * nutricional usa (valores_nutricionais_insumo.base_gramas). Líquido conta
 * como 1L=1000g (densidade 1): mesma simplificação que o resto do sistema já
 * assume ao não converter massa<->volume por densidade real. */
function pesoBrutoEmGramas(insumo: Insumo, pesoBruto: number): number {
  switch (insumo.unidadeMedida) {
    case "kg":
    case "l":
      return pesoBruto * 1000;
    case "g":
    case "ml":
      return pesoBruto;
    case "un":
      return pesoBruto * (insumo.pesoPorUnidade ?? 0) * 1000;
  }
}

function valoresPor100gDoInsumo(dados: ValoresNutricionaisInsumo | undefined): ValoresNutricionais | null {
  if (!dados) return null;
  const fator = 100 / dados.baseGramas;
  const preenchido = CAMPOS_NUTRICIONAIS.some((c) => dados.valores[c] != null);
  if (!preenchido) return null;
  return Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, (dados.valores[c] ?? 0) * fator])) as ValoresNutricionais;
}

interface ResultadoNutricional {
  porPorcao: ValoresNutricionais;
  completo: boolean;
}

/**
 * Nutricional por porção de uma receita (seção 5.9), recursivo pra
 * sub-receita -- mesmo padrão de calcularCmvReceita (cmv.ts): o preparo
 * resolve o próprio nutricional por porção, e a linha que o referencia no
 * prato pai multiplica isso pelo peso líquido informado, sem reconverter
 * unidade (mesma simplificação já usada pelo CMV pra sub-receita).
 */
function calcularNutricaoReceita(
  receita: Receita,
  insumoPorId: Map<string, Insumo>,
  receitaPorId: Map<string, Receita>,
  nutriPorInsumoId: Map<string, ValoresNutricionaisInsumo>,
  processamentos: Processamento[],
  cache: Map<string, ResultadoNutricional>,
): ResultadoNutricional {
  const existente = cache.get(receita.id);
  if (existente) return existente;

  const linhasInsumo: LinhaNutricional[] = [];
  let completo = true;
  const totalSubReceitas = zerado();

  for (const linha of receita.ficha) {
    if (linha.insumoId) {
      const insumo = insumoPorId.get(linha.insumoId);
      if (!insumo) {
        completo = false;
        continue;
      }
      const bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos);
      const por100g = valoresPor100gDoInsumo(nutriPorInsumoId.get(linha.insumoId));
      if (bruto === null || !por100g) {
        completo = false;
        continue;
      }
      linhasInsumo.push({ valoresPor100g: por100g, pesoBrutoUsadoGramas: pesoBrutoEmGramas(insumo, bruto) });
    } else if (linha.subReceitaId) {
      const sub = receitaPorId.get(linha.subReceitaId);
      if (!sub) {
        completo = false;
        continue;
      }
      const resultado = calcularNutricaoReceita(sub, insumoPorId, receitaPorId, nutriPorInsumoId, processamentos, cache);
      if (!resultado.completo) completo = false;
      for (const campo of CAMPOS_NUTRICIONAIS) totalSubReceitas[campo] += resultado.porPorcao[campo] * linha.pesoLiquido;
    }
  }

  const totalInsumos = calcularNutricionalPorPorcao(linhasInsumo, 1);
  const totalAbsoluto = zerado();
  for (const campo of CAMPOS_NUTRICIONAIS) totalAbsoluto[campo] = totalInsumos[campo] + totalSubReceitas[campo];
  const porPorcao = Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, totalAbsoluto[c] / receita.rendimento])) as ValoresNutricionais;

  const resultado = { porPorcao, completo };
  cache.set(receita.id, resultado);
  return resultado;
}

function insumosUsados(receita: Receita, receitaPorId: Map<string, Receita>, acc: Set<string> = new Set(), visitado: Set<string> = new Set()): Set<string> {
  if (visitado.has(receita.id)) return acc;
  visitado.add(receita.id);
  for (const linha of receita.ficha) {
    if (linha.insumoId) acc.add(linha.insumoId);
    else if (linha.subReceitaId) {
      const sub = receitaPorId.get(linha.subReceitaId);
      if (sub) insumosUsados(sub, receitaPorId, acc, visitado);
    }
  }
  return acc;
}

function InsumoNutricaoForm({ insumo, dados, onCancel, onSaved }: { insumo: Insumo; dados?: ValoresNutricionaisInsumo; onCancel: () => void; onSaved: () => void }) {
  const [baseGramas, setBaseGramas] = useState(dados ? String(dados.baseGramas) : "100");
  const [valores, setValores] = useState<Record<CampoNutricional, string>>(
    Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, dados?.valores[c] != null ? String(dados.valores[c]) : ""])) as Record<CampoNutricional, string>,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const resultado = await acaoSalvarValoresInsumo(insumo.id, {
      baseGramas: parseFloat(baseGramas) || 100,
      valores: Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, valores[c] === "" ? null : parseFloat(valores[c])])) as Partial<ValoresNutricionais>,
    });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-medium flex-1">{insumo.nome}</span>
        <span className="text-[11px]" style={{ color: C.faint }}>valores por</span>
        <input type="number" value={baseGramas} onChange={(e) => setBaseGramas(e.target.value)} className="text-[12px] px-2 py-1 rounded-md w-16 text-right" style={{ ...inputStyle, ...nums }} />
        <span className="text-[11px]" style={{ color: C.faint }}>g/mL</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {CAMPOS_NUTRICIONAIS.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="text-[11.5px] flex-1" style={{ color: C.sub }}>{LABEL_CAMPO[c]}</span>
            <input
              type="number"
              value={valores[c]}
              onChange={(e) => setValores({ ...valores, [c]: e.target.value })}
              className="text-[12px] px-2 py-1 rounded-md w-20 text-right"
              style={{ ...inputStyle, ...nums }}
            />
          </div>
        ))}
      </div>
      {erro && (
        <div className="text-[12px] mb-2 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function RotulagemForm({ rotulagem, onSaved }: { rotulagem?: Rotulagem; onSaved: (r: { ingredientes: string; alergenos: string; gluten: string; lactose: string; fabricante: string; endereco: string; pesoLiquido: string; conservacao: string }) => void }) {
  const [campos, setCampos] = useState({
    ingredientes: rotulagem?.ingredientes ?? "",
    alergenos: rotulagem?.alergenos ?? "",
    gluten: rotulagem?.gluten ?? "",
    lactose: rotulagem?.lactose ?? "",
    fabricante: rotulagem?.fabricante ?? "",
    endereco: rotulagem?.endereco ?? "",
    pesoLiquido: rotulagem?.pesoLiquido ?? "",
    conservacao: rotulagem?.conservacao ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const campo = (chave: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement>) => setCampos({ ...campos, [chave]: e.target.value });

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    onSaved(campos);
    setSalvando(false);
  };

  return (
    <div className="px-3.5 pb-3.5" style={{ borderTop: `1px solid ${C.border}` }}>
      <p className="text-[11.5px] my-3" style={{ color: C.sub }}>
        Só faz falta pra quem vende em mercado ou varejo de terceiro. Quem serve no próprio estabelecimento pode deixar tudo em branco, o resto do sistema funciona igual.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(
          [
            ["ingredientes", "Lista de ingredientes (ordem decrescente de peso)", true],
            ["alergenos", "Alérgenos (RDC 26/2015)", true],
            ["gluten", "Glúten: contém / não contém", false],
            ["lactose", "Lactose, quando aplicável", false],
            ["fabricante", "Fabricante e CNPJ", false],
            ["endereco", "Endereço do fabricante", false],
            ["pesoLiquido", "Peso líquido da embalagem", false],
            ["conservacao", "Modo de conservação e validade", false],
          ] as const
        ).map(([chave, label, largo]) => (
          <div key={chave} className={largo ? "col-span-2" : ""}>
            <div className="text-[10.5px] mb-1" style={{ color: C.faint }}>{label}</div>
            <input value={campos[chave]} onChange={campo(chave)} className="text-[12px] px-2.5 py-1.5 rounded-md w-full" style={inputStyle} />
          </div>
        ))}
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
        {salvando ? "Salvando..." : "Salvar dados de rotulagem"}
      </button>
    </div>
  );
}

export function NutricionalClient({
  pratos,
  preparos,
  insumos,
  processamentos,
  valoresInsumos,
  overrides,
  rotulagens,
}: {
  pratos: Receita[];
  preparos: Receita[];
  insumos: Insumo[];
  processamentos: Processamento[];
  valoresInsumos: ValoresNutricionaisInsumo[];
  overrides: NutricionalOverride[];
  rotulagens: Rotulagem[];
}) {
  const [pratoSelecionadoId, setPratoSelecionadoId] = useState(pratos[0]?.id ?? "");
  const [editandoOverride, setEditandoOverride] = useState(false);
  const [rascunhoOverride, setRascunhoOverride] = useState<Record<CampoNutricional, string>>({} as Record<CampoNutricional, string>);
  const [insumoEditandoId, setInsumoEditandoId] = useState<string | null>(null);
  const [rotulagemAberta, setRotulagemAberta] = useState(false);

  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const receitaPorId = useMemo(() => new Map([...pratos, ...preparos].map((r) => [r.id, r])), [pratos, preparos]);
  const nutriPorInsumoId = useMemo(() => new Map(valoresInsumos.map((v) => [v.insumoId, v])), [valoresInsumos]);
  const overridePorReceitaId = useMemo(() => new Map(overrides.map((o) => [o.receitaId, o])), [overrides]);
  const rotulagemPorReceitaId = useMemo(() => new Map(rotulagens.map((r) => [r.receitaId, r])), [rotulagens]);

  const prato = pratos.find((p) => p.id === pratoSelecionadoId);

  const executarAcaoSimples = async (promessa: Promise<{ ok: boolean; erro?: string }>) => {
    const resultado = await promessa;
    if (!resultado.ok) window.alert(resultado.erro ?? "Erro desconhecido.");
  };

  if (pratos.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-[13px]" style={{ color: C.sub }}>Nenhum prato final cadastrado ainda. Cadastre um em Receitas & Fichas primeiro.</p>
        </Card>
      </div>
    );
  }

  if (!prato) return null;

  const cache = new Map<string, ResultadoNutricional>();
  const { porPorcao: porPorcaoCalculado, completo: nutriCompleta } = calcularNutricaoReceita(prato, insumoPorId, receitaPorId, nutriPorInsumoId, processamentos, cache);
  const override = overridePorReceitaId.get(prato.id);
  const temOverride = !!override;
  const n = aplicarOverride(porPorcaoCalculado, override?.valores ?? null);

  const paraVarejo = prato.destinoVenda === "varejo_terceiro";
  const n100 = prato.pesoPorcaoG ? calcularNutricionalPor100g(n, prato.pesoPorcaoG) : null;
  const altoEm = n100 ? nutrientesComSeloFrontal(n100, prato.formaFisica) : [];

  const idsInsumosUsados = insumosUsados(prato, receitaPorId);
  const insumosSemDados = [...idsInsumosUsados].map((id) => insumoPorId.get(id)).filter((i): i is Insumo => !!i && !valoresPor100gDoInsumo(nutriPorInsumoId.get(i.id)));

  const rotulagem = rotulagemPorReceitaId.get(prato.id);
  const camposPreenchidos = rotulagem
    ? [rotulagem.ingredientes, rotulagem.alergenos, rotulagem.gluten, rotulagem.lactose, rotulagem.fabricante, rotulagem.endereco, rotulagem.pesoLiquido, rotulagem.conservacao].filter((v) => v && v.trim()).length
    : 0;
  const rotulagemOk = (campo: keyof NonNullable<typeof rotulagem>): boolean => !!(rotulagem && rotulagem[campo] && String(rotulagem[campo]).trim());

  return (
    <div className="max-w-5xl">
      <h2 className="text-[14px] font-semibold mb-1">Ficha nutricional por porção</h2>
      <p className="text-[12px] mb-3" style={{ color: C.sub }}>Calculado a partir do peso bruto de cada insumo na receita, mesma lógica do CMV. Aproximação de cálculo, não laudo laboratorial.</p>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {pratos.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPratoSelecionadoId(p.id);
              setEditandoOverride(false);
              setInsumoEditandoId(null);
              setRotulagemAberta(false);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: pratoSelecionadoId === p.id ? C.text : C.panel, color: pratoSelecionadoId === p.id ? "#fff" : C.text, border: `1px solid ${pratoSelecionadoId === p.id ? C.text : C.borderStrong}` }}
          >
            {p.nomePrato}
          </button>
        ))}
      </div>

      <div className="text-[12.5px] mb-4" style={{ color: C.sub }}>
        Destino de venda: <b style={{ color: C.text }}>{paraVarejo ? "Varejo/mercado de terceiro" : "Próprio estabelecimento"}</b>{" "}
        <span style={{ color: C.faint }}>(edite em Receitas &amp; Fichas)</span>
      </div>

      {paraVarejo ? (
        <div className="text-[12px] mb-3" style={{ color: C.sub }}>Vendido fora do próprio estabelecimento: rotulagem nutricional completa é obrigatória (RDC 429/2020), incluindo alerta frontal se aplicável. Tabela abaixo já força fundo branco e letra preta, formato exigido pela norma.</div>
      ) : (
        <div className="text-[12px] mb-3" style={{ color: C.sub }}>Vendido no próprio estabelecimento (balcão/delivery): rotulagem é voluntária, não obrigatória (IN 75/2020, Anexo I).</div>
      )}

      {paraVarejo && altoEm.length > 0 && (
        <div className="rounded-lg p-3 mb-4 text-[12.5px]" style={{ background: C.dangerSoft, color: C.danger }}>
          <b>Alto em {altoEm.map((campo) => LABEL_SELO[campo]).join(", ")}</b> — esse produto precisa do selo de alerta frontal (lupa). Avaliado por 100{prato.formaFisica === "liquido" ? "mL" : "g"} do alimento, base que a norma usa, não por porção. O desenho oficial do selo é o arquivo vetorial do Anexo XVII da IN 75/2020, precisa ser aplicado na arte da embalagem.
        </div>
      )}

      {insumosSemDados.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] mb-2" style={{ color: C.sub }}>
            {insumosSemDados.length} insumo{insumosSemDados.length > 1 ? "s" : ""} usado{insumosSemDados.length > 1 ? "s" : ""} nesta ficha ainda sem dado nutricional cadastrado:
          </div>
          <div className="space-y-2">
            {insumosSemDados.map((insumo) =>
              insumoEditandoId === insumo.id ? (
                <InsumoNutricaoForm key={insumo.id} insumo={insumo} dados={nutriPorInsumoId.get(insumo.id)} onCancel={() => setInsumoEditandoId(null)} onSaved={() => setInsumoEditandoId(null)} />
              ) : (
                <div key={insumo.id} className="flex items-center justify-between px-3.5 py-2 rounded-lg text-[12.5px]" style={{ background: C.dangerSoft }}>
                  <span style={{ color: C.danger }}>{insumo.nome}</span>
                  <button onClick={() => setInsumoEditandoId(insumo.id)} className="font-medium" style={{ color: C.danger }}>
                    cadastrar valores
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => {
            if (editandoOverride) {
              setEditandoOverride(false);
              return;
            }
            setRascunhoOverride(Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, n[c].toFixed(1)])) as Record<CampoNutricional, string>);
            setEditandoOverride(true);
          }}
          className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: editandoOverride ? C.bg : C.text, color: editandoOverride ? C.text : "#fff", border: `1px solid ${editandoOverride ? C.borderStrong : C.text}` }}
        >
          {editandoOverride ? "Cancelar edição" : "Editar valores"}
        </button>
        {temOverride && (
          <>
            <Badge acao>valor de laudo, não calculado</Badge>
            <button onClick={() => executarAcaoSimples(acaoRemoverOverride(prato.id))} className="text-[11.5px]" style={{ color: C.sub }}>
              voltar ao calculado
            </button>
          </>
        )}
      </div>

      {editandoOverride && (
        <Card className="p-5 mb-3 max-w-lg">
          <p className="text-[11.5px] mb-3" style={{ color: C.sub }}>Use isto quando tiver laudo laboratorial: o valor informado aqui substitui o cálculo por composição de ingrediente na tabela e no selo frontal. Valores por porção.</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CAMPOS_NUTRICIONAIS.map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-[11.5px] flex-1" style={{ color: C.sub }}>{LABEL_CAMPO[c]}</span>
                <input
                  type="number"
                  value={rascunhoOverride[c] ?? ""}
                  onChange={(e) => setRascunhoOverride({ ...rascunhoOverride, [c]: e.target.value })}
                  className="text-[12px] px-2 py-1 rounded-md w-20 text-right"
                  style={{ ...inputStyle, ...nums }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              const valores = Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, parseFloat(rascunhoOverride[c]) || 0])) as ValoresNutricionais;
              await executarAcaoSimples(acaoSalvarOverride(prato.id, { valores }));
              setEditandoOverride(false);
            }}
            className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg"
            style={{ background: C.text, color: "#fff" }}
          >
            Salvar valores do laudo
          </button>
        </Card>
      )}

      <Card className="p-6 max-w-lg" style={paraVarejo ? { backgroundColor: "#FFFFFF", color: "#000000" } : {}}>
        <div className="mb-2" style={{ borderBottom: `3px solid ${paraVarejo ? "#000" : C.text}`, paddingBottom: 6 }}>
          <div className="text-[14px] font-bold" style={paraVarejo ? { color: "#000" } : {}}>INFORMAÇÃO NUTRICIONAL</div>
          <div className="text-[11px] mt-0.5" style={{ color: paraVarejo ? "#000" : C.sub }}>
            {prato.rendimento} porç{prato.rendimento > 1 ? "ões" : "ão"} por embalagem{prato.pesoPorcaoG ? ` · porção de ${prato.pesoPorcaoG}g` : ""}
          </div>
        </div>
        {!nutriCompleta && (
          <div className="text-[11.5px] mb-2" style={{ color: paraVarejo ? "#900" : C.sub }}>Atenção: alguns insumos ainda não têm dado nutricional cadastrado, os valores abaixo estão incompletos e não podem ser impressos como rótulo.</div>
        )}
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: paraVarejo ? "#000" : C.faint, borderBottom: `1.5px solid ${paraVarejo ? "#000" : C.border}` }} className="text-left text-[10.5px]">
              <th className="py-1 font-semibold"></th>
              <th className="py-1 font-semibold text-right">Por porção{prato.pesoPorcaoG ? <><br />({prato.pesoPorcaoG}g)</> : null}</th>
              <th className="py-1 font-semibold text-right">Por 100{prato.formaFisica === "liquido" ? "mL" : "g"}</th>
              <th className="py-1 font-semibold text-right">%VD*</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS_TABELA.map((l) => {
              const vdValor = l.vd ? calcularPercentualVD(n, l.campo) : null;
              return (
                <tr key={l.label} style={{ borderTop: `1px solid ${paraVarejo ? "#999" : C.border}` }}>
                  <td className="py-1.5" style={{ color: paraVarejo ? "#000" : l.label.startsWith("   ") ? C.sub : C.text }}>{l.label}</td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : C.text }}>
                    {n[l.campo].toFixed(1)}{l.un}{l.kj ? ` (${(n[l.campo] * 4.184).toFixed(0)}kJ)` : ""}
                  </td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : C.sub }}>
                    {n100 ? `${n100[l.campo].toFixed(1)}${l.un}` : "—"}
                  </td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : C.sub }}>
                    {vdValor !== null ? `${vdValor.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="text-[9.5px] mt-2 leading-snug" style={{ color: paraVarejo ? "#000" : C.faint }}>
          *Percentual de valores diários fornecidos pela porção, com base numa dieta de 2.000kcal ou 8.400kJ. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas. Açúcares totais não têm %VD definido pela norma.
        </div>
      </Card>

      {paraVarejo && (
        <Card className="mt-4 max-w-lg">
          <button onClick={() => setRotulagemAberta(!rotulagemAberta)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-medium">Dados de rotulagem</span>
              <Badge>opcional</Badge>
            </div>
            <span className="text-[11px]" style={{ color: C.faint }}>{camposPreenchidos} de 8 campos preenchidos</span>
          </button>
          {rotulagemAberta && (
            <RotulagemForm
              rotulagem={rotulagem}
              onSaved={(campos) => executarAcaoSimples(acaoSalvarRotulagem(prato.id, campos))}
            />
          )}
        </Card>
      )}

      {paraVarejo && (
        <Card className="p-5 mt-4 max-w-lg">
          <h3 className="text-[13px] font-semibold mb-1">Falta pro rótulo ficar pronto</h3>
          <p className="text-[11.5px] mb-3" style={{ color: C.sub }}>A tabela acima está no formato da norma, mas rótulo comercial exige mais do que ela. Nenhum destes é gerado pelo sistema.</p>
          {(
            [
              ["Valor nutricional validado", temOverride ? "Valor de laudo informado na ficha nutricional." : 'Os números vêm de cálculo por composição de ingrediente, não de laudo. Use o botão "Editar valores" pra informar o laudo (tolerância de fiscalização é 20%).', temOverride],
              ["Lista de ingredientes", "Em ordem decrescente de peso, obrigatória. Preenchida acima, em Dados de rotulagem.", rotulagemOk("ingredientes")],
              ["Alérgenos", "Alerta dos alérgenos obrigatórios (RDC 26/2015) e de lactose quando aplicável (RDC 135/2017).", rotulagemOk("alergenos")],
              ["Glúten", '"Contém glúten" ou "não contém glúten", obrigatório em todo alimento (Lei 10.674/2003).', rotulagemOk("gluten")],
              ["Identificação legal", "Fabricante, CNPJ, endereço e peso líquido. Lote e validade saem do quadro de produção.", rotulagemOk("fabricante") && rotulagemOk("endereco") && rotulagemOk("pesoLiquido")],
              ...(altoEm.length > 0 ? [["Selo de alerta frontal", "Arte vetorial oficial do Anexo XVII, aplicada na face frontal conforme as regras de posição e tamanho do Anexo XVIII.", false] as const] : []),
              ["Registro sanitário", "Regularização do produto e do estabelecimento na vigilância sanitária (e SIF/SIE/SIM se for produto de origem animal). Fora do sistema.", false],
            ] as const
          ).map(([titulo, desc, feito]) => (
            <div key={titulo} className="flex gap-2.5 py-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="w-3.5 h-3.5 rounded shrink-0 mt-0.5 flex items-center justify-center" style={{ border: `1.5px solid ${feito ? C.accent : C.borderStrong}`, background: feito ? C.accent : "transparent" }}>
                {feito && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: feito ? C.sub : C.text }}>{titulo}</div>
                <div className="text-[11.5px]" style={{ color: C.sub }}>{desc}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
