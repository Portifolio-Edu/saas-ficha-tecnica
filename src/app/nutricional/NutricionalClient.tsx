"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { inputStyle, nums } from "@/components/ficha/tema";
import { InsumoNutricaoForm } from "@/components/nutricional/InsumoNutricaoForm";
import { RotulagemForm } from "@/components/nutricional/RotulagemForm";
import { LABEL_CAMPO } from "@/components/nutricional/labels";
import type { LinhaRotuloPdf } from "@/lib/pdf/RotuloNutricionalPdf";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { NutricionalOverride, Rotulagem, ValoresNutricionaisInsumo } from "@/lib/dominio/nutricional";
import {
  CAMPOS_NUTRICIONAIS,
  calcularNutricaoReceita,
  calcularNutricionalPor100g,
  calcularPercentualVD,
  insumosUsados,
  nutrientesComSeloFrontal,
  valoresPor100gDoInsumo,
  aplicarOverride,
  type CampoNutricional,
  type ValoresNutricionais,
} from "@/lib/calculo/nutricional";
import { acaoSalvarOverride, acaoRemoverOverride, acaoSalvarRotulagem } from "./actions";

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
  const [gerandoRotulo, setGerandoRotulo] = useState(false);

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
          <p className="text-[13px]" style={{ color: "var(--sub)" }}>Nenhum prato final cadastrado ainda. Cadastre um em Receitas & Fichas primeiro.</p>
        </Card>
      </div>
    );
  }

  if (!prato) return null;

  const { porPorcao: porPorcaoCalculado, completo: nutriCompleta } = calcularNutricaoReceita(prato, insumoPorId, receitaPorId, nutriPorInsumoId, processamentos);
  const override = overridePorReceitaId.get(prato.id);
  const temOverride = !!override;
  const n = aplicarOverride(porPorcaoCalculado, override?.valores ?? null);

  const paraVarejo = prato.destinoVenda === "varejo_terceiro";
  const n100 = prato.pesoPorcaoG ? calcularNutricionalPor100g(n, prato.pesoPorcaoG) : null;
  const altoEm = n100 ? nutrientesComSeloFrontal(n100, prato.formaFisica) : [];

  const gerarPdfRotulo = async () => {
    setGerandoRotulo(true);
    try {
      const unidadeMassa = prato.formaFisica === "liquido" ? "mL" : "g";
      const linhas: LinhaRotuloPdf[] = LINHAS_TABELA.map((l) => {
        const vdValor = l.vd ? calcularPercentualVD(n, l.campo) : null;
        return {
          label: l.label.trim(),
          valorPorcao: `${n[l.campo].toFixed(1)}${l.un}${l.kj ? ` (${(n[l.campo] * 4.184).toFixed(0)}kJ)` : ""}`,
          valorPor100: n100 ? `${n100[l.campo].toFixed(1)}${l.un}` : "—",
          vd: vdValor !== null ? `${vdValor.toFixed(0)}%` : "—",
        };
      });

      const [{ gerarRotuloNutricionalPdfBlob }, { baixarBlob, nomeArquivoSeguro }] = await Promise.all([
        import("@/lib/pdf/RotuloNutricionalPdf"),
        import("@/lib/pdf/baixar"),
      ]);
      const blob = await gerarRotuloNutricionalPdfBlob({
        nomePrato: prato.nomePrato,
        rendimento: prato.rendimento,
        pesoPorcaoG: prato.pesoPorcaoG,
        unidadeMassa,
        linhas,
        nutrientesComSelo: altoEm.map((campo) => LABEL_SELO[campo] ?? campo),
        nutriCompleta,
        geradoEm: new Date().toLocaleDateString("pt-BR"),
      });
      baixarBlob(blob, `rotulo-nutricional-${nomeArquivoSeguro(prato.nomePrato)}.pdf`);
    } finally {
      setGerandoRotulo(false);
    }
  };

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
      <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Calculado a partir do peso bruto de cada insumo na receita, mesma lógica do CMV. Aproximação de cálculo, não laudo laboratorial.</p>
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
            style={{ background: pratoSelecionadoId === p.id ? "var(--text)" : "var(--panel)", color: pratoSelecionadoId === p.id ? "#fff" : "var(--text)", border: `1px solid ${pratoSelecionadoId === p.id ? "var(--text)" : "var(--border-strong)"}` }}
          >
            {p.nomePrato}
          </button>
        ))}
      </div>

      <div className="text-[12.5px] mb-4" style={{ color: "var(--sub)" }}>
        Destino de venda: <b style={{ color: "var(--text)" }}>{paraVarejo ? "Varejo/mercado de terceiro" : "Próprio estabelecimento"}</b>{" "}
        <span style={{ color: "var(--faint)" }}>(edite em Receitas &amp; Fichas)</span>
      </div>

      {paraVarejo ? (
        <div className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Vendido fora do próprio estabelecimento: rotulagem nutricional completa é obrigatória (RDC 429/2020), incluindo alerta frontal se aplicável. Tabela abaixo já força fundo branco e letra preta, formato exigido pela norma.</div>
      ) : (
        <div className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Vendido no próprio estabelecimento (balcão/delivery): rotulagem é voluntária, não obrigatória (IN 75/2020, Anexo I).</div>
      )}

      {paraVarejo && altoEm.length > 0 && (
        <div className="rounded-lg p-3 mb-4 text-[12.5px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <b>Alto em {altoEm.map((campo) => LABEL_SELO[campo]).join(", ")}</b> — esse produto precisa do selo de alerta frontal (lupa). Avaliado por 100{prato.formaFisica === "liquido" ? "mL" : "g"} do alimento, base que a norma usa, não por porção. O desenho oficial do selo é o arquivo vetorial do Anexo XVII da IN 75/2020, precisa ser aplicado na arte da embalagem.
        </div>
      )}

      {insumosSemDados.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] mb-2" style={{ color: "var(--sub)" }}>
            {insumosSemDados.length} insumo{insumosSemDados.length > 1 ? "s" : ""} usado{insumosSemDados.length > 1 ? "s" : ""} nesta ficha ainda sem dado nutricional cadastrado:
          </div>
          <div className="space-y-2">
            {insumosSemDados.map((insumo) =>
              insumoEditandoId === insumo.id ? (
                <InsumoNutricaoForm key={insumo.id} insumo={insumo} dados={nutriPorInsumoId.get(insumo.id)} onCancel={() => setInsumoEditandoId(null)} onSaved={() => setInsumoEditandoId(null)} />
              ) : (
                <div key={insumo.id} className="flex items-center justify-between px-3.5 py-2 rounded-lg text-[12.5px]" style={{ background: "var(--danger-soft)" }}>
                  <span style={{ color: "var(--danger)" }}>{insumo.nome}</span>
                  <button onClick={() => setInsumoEditandoId(insumo.id)} className="font-medium" style={{ color: "var(--danger)" }}>
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
          style={{ background: editandoOverride ? "var(--bg)" : "var(--text)", color: editandoOverride ? "var(--text)" : "#fff", border: `1px solid ${editandoOverride ? "var(--border-strong)" : "var(--text)"}` }}
        >
          {editandoOverride ? "Cancelar edição" : "Editar valores"}
        </button>
        {temOverride && (
          <>
            <Badge acao>valor de laudo, não calculado</Badge>
            <button onClick={() => executarAcaoSimples(acaoRemoverOverride(prato.id))} className="text-[11.5px]" style={{ color: "var(--sub)" }}>
              voltar ao calculado
            </button>
          </>
        )}
      </div>

      {editandoOverride && (
        <Card className="p-5 mb-3 max-w-lg">
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Use isto quando tiver laudo laboratorial: o valor informado aqui substitui o cálculo por composição de ingrediente na tabela e no selo frontal. Valores por porção.</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CAMPOS_NUTRICIONAIS.map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-[11.5px] flex-1" style={{ color: "var(--sub)" }}>{LABEL_CAMPO[c]}</span>
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
            style={{ background: "var(--text)", color: "#fff" }}
          >
            Salvar valores do laudo
          </button>
        </Card>
      )}

      <Card className="p-6 max-w-lg" style={paraVarejo ? { backgroundColor: "#FFFFFF", color: "#000000" } : {}}>
        <div className="mb-2" style={{ borderBottom: `3px solid ${paraVarejo ? "#000" : "var(--text)"}`, paddingBottom: 6 }}>
          <div className="text-[14px] font-bold" style={paraVarejo ? { color: "#000" } : {}}>INFORMAÇÃO NUTRICIONAL</div>
          <div className="text-[11px] mt-0.5" style={{ color: paraVarejo ? "#000" : "var(--sub)" }}>
            {prato.rendimento} porç{prato.rendimento > 1 ? "ões" : "ão"} por embalagem{prato.pesoPorcaoG ? ` · porção de ${prato.pesoPorcaoG}g` : ""}
          </div>
        </div>
        {!nutriCompleta && (
          <div className="text-[11.5px] mb-2" style={{ color: paraVarejo ? "#900" : "var(--sub)" }}>Atenção: alguns insumos ainda não têm dado nutricional cadastrado, os valores abaixo estão incompletos e não podem ser impressos como rótulo.</div>
        )}
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ color: paraVarejo ? "#000" : "var(--faint)", borderBottom: `1.5px solid ${paraVarejo ? "#000" : "var(--border)"}` }} className="text-left text-[10.5px]">
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
                <tr key={l.label} style={{ borderTop: `1px solid ${paraVarejo ? "#999" : "var(--border)"}` }}>
                  <td className="py-1.5" style={{ color: paraVarejo ? "#000" : l.label.startsWith("   ") ? "var(--sub)" : "var(--text)" }}>{l.label}</td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : "var(--text)" }}>
                    {n[l.campo].toFixed(1)}{l.un}{l.kj ? ` (${(n[l.campo] * 4.184).toFixed(0)}kJ)` : ""}
                  </td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : "var(--sub)" }}>
                    {n100 ? `${n100[l.campo].toFixed(1)}${l.un}` : "—"}
                  </td>
                  <td className="py-1.5 text-right" style={{ ...nums, color: paraVarejo ? "#000" : "var(--sub)" }}>
                    {vdValor !== null ? `${vdValor.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="text-[9.5px] mt-2 leading-snug" style={{ color: paraVarejo ? "#000" : "var(--faint)" }}>
          *Percentual de valores diários fornecidos pela porção, com base numa dieta de 2.000kcal ou 8.400kJ. Seus valores diários podem ser maiores ou menores dependendo das suas necessidades energéticas. Açúcares totais não têm %VD definido pela norma.
        </div>
      </Card>

      <button
        onClick={gerarPdfRotulo}
        disabled={gerandoRotulo}
        className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-lg mt-3"
        style={{ background: "var(--text)", color: "#fff", opacity: gerandoRotulo ? 0.6 : 1 }}
      >
        <Download size={13} /> {gerandoRotulo ? "Gerando..." : "PDF · Rótulo Nutricional"}
      </button>

      {paraVarejo && (
        <Card className="mt-4 max-w-lg">
          <button onClick={() => setRotulagemAberta(!rotulagemAberta)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-medium">Dados de rotulagem</span>
              <Badge>opcional</Badge>
            </div>
            <span className="text-[11px]" style={{ color: "var(--faint)" }}>{camposPreenchidos} de 8 campos preenchidos</span>
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
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>A tabela acima está no formato da norma, mas rótulo comercial exige mais do que ela. Nenhum destes é gerado pelo sistema.</p>
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
            <div key={titulo} className="flex gap-2.5 py-2" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
              <div className="w-3.5 h-3.5 rounded shrink-0 mt-0.5 flex items-center justify-center" style={{ border: `1.5px solid ${feito ? "var(--accent)" : "var(--border-strong)"}`, background: feito ? "var(--accent)" : "transparent" }}>
                {feito && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
              </div>
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: feito ? "var(--sub)" : "var(--text)" }}>{titulo}</div>
                <div className="text-[11.5px]" style={{ color: "var(--sub)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
