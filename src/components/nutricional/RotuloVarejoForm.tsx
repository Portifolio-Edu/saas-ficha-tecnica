"use client";

// RÓTULO PARA VAREJO (2026-09-26): dados do rótulo de supermercado, agora
// estruturados (antes eram 8 caixas de texto livre). Alergênicos por item
// (contém / derivados / pode conter), glúten e lactose como escolha, medida
// caseira, peso líquido, conservação e preparo com atalhos, e a lista de
// ingredientes gerada da ficha (pode ajustar à mão). Regras e textos:
// src/lib/dominio/rotuloVarejo.ts.

import { useState } from "react";
import { Check, Wand2 } from "lucide-react";
import { useToast } from "@/components/ficha/Toast";
import {
  ALERGENICOS, TEXTO_GLUTEN, TEXTO_LACTOSE, glutenPelosAlergenicos, textoAlergicos,
  type IdAlergenico, type MapaAlergenicos, type PresencaAlergenico, type StatusGluten, type StatusLactose,
} from "@/lib/dominio/rotuloVarejo";
import type { Rotulagem, RotulagemInput } from "@/lib/dominio/nutricional";

type Resultado = { ok: boolean; erro?: string };

const PRESENCAS: { id: PresencaAlergenico; rotulo: string }[] = [
  { id: "contem", rotulo: "Contém" },
  { id: "derivados", rotulo: "Derivados" },
  { id: "pode_conter", rotulo: "Pode conter" },
];

const ATALHOS_CONSERVACAO = [
  "Conservar em local seco e fresco, ao abrigo da luz.",
  "Manter refrigerado entre 0 °C e 5 °C.",
  "Manter congelado a -18 °C ou mais frio.",
  "Depois de descongelado, não congelar novamente.",
  "Depois de aberto, manter refrigerado e consumir em até 3 dias.",
];

const campo = "w-full rounded-lg border bg-[var(--panel)] text-[var(--tinta)] text-[14px] px-3 outline-none focus:ring-2 focus:ring-[var(--marca-suave)]";
const rotulo = "block text-[12.5px] font-medium text-[var(--tinta-sub)] mb-1.5";

function Escolha<T extends string>({ opcoes, valor, onChange, nome }: { opcoes: { id: T; rotulo: string }[]; valor: T | null; onChange: (v: T) => void; nome: string }) {
  return (
    <div role="radiogroup" aria-label={nome} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = valor === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.id)}
            className="min-h-10 px-3.5 rounded-lg border text-[13px] font-semibold tracking-wide"
            style={ativo ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="py-5 border-t first:border-t-0 first:pt-0" style={{ borderColor: "var(--linha)" }}>
      <h4 className="text-[14px] font-semibold text-[var(--tinta)]">{titulo}</h4>
      {descricao && <p className="text-[12.5px] text-[var(--tinta-sub)] mt-0.5 mb-3">{descricao}</p>}
      {!descricao && <div className="h-3" />}
      {children}
    </section>
  );
}

export function RotuloVarejoForm({
  rotulagem,
  ingredientesGerados,
  salvar,
  aoSalvar,
}: {
  rotulagem?: Rotulagem;
  ingredientesGerados: string | null;
  salvar: (input: RotulagemInput) => Promise<Resultado>;
  aoSalvar?: () => void;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [alergenicos, setAlergenicos] = useState<MapaAlergenicos | null>(rotulagem?.alergenicos ?? null);
  const [gluten, setGluten] = useState<StatusGluten | null>(rotulagem?.glutenStatus ?? null);
  const [lactose, setLactose] = useState<StatusLactose | null>(rotulagem?.lactoseStatus ?? null);
  const [texto, setTexto] = useState({
    ingredientes: rotulagem?.ingredientes ?? "",
    medidaCaseira: rotulagem?.medidaCaseira ?? "",
    pesoLiquido: rotulagem?.pesoLiquido ?? "",
    conservacao: rotulagem?.conservacao ?? "",
    modoPreparo: rotulagem?.modoPreparo ?? "",
    fabricante: rotulagem?.fabricante ?? "",
    endereco: rotulagem?.endereco ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const muda = (k: keyof typeof texto) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTexto({ ...texto, [k]: e.target.value });

  const marcar = (id: IdAlergenico, p: PresencaAlergenico) =>
    setAlergenicos((m) => {
      const novo = { ...(m ?? {}) };
      if (novo[id] === p) delete novo[id];
      else novo[id] = p;
      return novo;
    });

  const sugestaoGluten = glutenPelosAlergenicos(alergenicos);
  const alerta = textoAlergicos(alergenicos);
  const temLeite = alergenicos?.leite === "contem" || alergenicos?.leite === "derivados";

  const enviar = async () => {
    setSalvando(true);
    const r = await salvar({
      ingredientes: texto.ingredientes.trim(),
      alergenos: alerta ?? "",
      gluten: gluten ? TEXTO_GLUTEN[gluten] : "",
      lactose: lactose ? (TEXTO_LACTOSE[lactose] ?? "") : "",
      fabricante: texto.fabricante.trim(),
      endereco: texto.endereco.trim(),
      pesoLiquido: texto.pesoLiquido.trim(),
      conservacao: texto.conservacao.trim(),
      alergenicos,
      glutenStatus: gluten,
      lactoseStatus: lactose,
      medidaCaseira: texto.medidaCaseira,
      modoPreparo: texto.modoPreparo,
    });
    setSalvando(false);
    if (!r.ok) return mostrarErro(r.erro ?? "Não foi possível salvar.");
    mostrarSucesso("Dados do rótulo salvos.");
    aoSalvar?.();
  };

  return (
    <div>
      <Secao titulo="Alergênicos" descricao='Marque o que o produto contém, os ingredientes feitos a partir deles ("derivados") e o risco de contaminação cruzada ("pode conter"). RDC 26/2015.'>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5" role="group" aria-label="Alergênicos">
          {ALERGENICOS.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 min-h-11">
              <span className="text-[14px] text-[var(--tinta)]">{a.nome.charAt(0).toUpperCase() + a.nome.slice(1)}</span>
              <div className="flex gap-1" role="group" aria-label={a.nome}>
                {PRESENCAS.map((p) => {
                  const ativo = alergenicos?.[a.id] === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={ativo}
                      aria-label={`${a.nome}: ${p.rotulo}`}
                      onClick={() => marcar(a.id, p.id)}
                      className="min-h-9 px-2.5 rounded-md border text-[12px] font-medium"
                      style={
                        ativo
                          ? {
                              background: `color-mix(in srgb, ${p.id === "pode_conter" ? "var(--aviso)" : "var(--sinal)"} 20%, var(--panel))`,
                              borderColor: p.id === "pode_conter" ? "var(--aviso)" : "var(--sinal)",
                              color: "var(--tinta)",
                              fontWeight: 600,
                            }
                          : { borderColor: "var(--linha)", color: "var(--tinta-sub)" }
                      }
                    >
                      {p.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAlergenicos({})}
            aria-pressed={alergenicos !== null && Object.keys(alergenicos).length === 0}
            className="min-h-10 px-3.5 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5"
            style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
          >
            <Check size={14} /> Não contém nenhum alergênico
          </button>
          <span className="text-[12.5px] text-[var(--tinta-sub)]">
            {alergenicos === null ? "Ainda não revisado." : alerta ? "Vai sair no rótulo:" : "Revisado: sem alergênicos."}
          </span>
        </div>
        {alerta && <p className="mt-2 text-[13px] font-bold tracking-wide text-[var(--tinta)] rounded-lg border px-3 py-2" style={{ borderColor: "var(--linha-forte)" }}>{alerta}</p>}
      </Secao>

      <Secao titulo="Glúten e lactose">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <span className={rotulo}>Glúten (obrigatório, Lei 10.674/2003)</span>
            <Escolha nome="Glúten" valor={gluten} onChange={setGluten} opcoes={[{ id: "contem", rotulo: "CONTÉM GLÚTEN" }, { id: "nao_contem", rotulo: "NÃO CONTÉM GLÚTEN" }]} />
            {sugestaoGluten === "contem" && gluten !== "contem" && (
              <p className="text-[12.5px] mt-2" style={{ color: "var(--danger)" }}>Tem trigo, centeio, cevada ou aveia: o certo é “CONTÉM GLÚTEN”.</p>
            )}
          </div>
          <div>
            <span className={rotulo}>Lactose (RDC 136/2017)</span>
            <Escolha
              nome="Lactose"
              valor={lactose}
              onChange={setLactose}
              opcoes={[
                { id: "contem", rotulo: "CONTÉM LACTOSE" },
                { id: "zero", rotulo: "ZERO LACTOSE" },
                { id: "baixo", rotulo: "BAIXO TEOR" },
                { id: "nao_se_aplica", rotulo: "Não se aplica" },
              ]}
            />
            {temLeite && (!lactose || lactose === "nao_se_aplica") && (
              <p className="text-[12.5px] mt-2" style={{ color: "var(--danger)" }}>Tem leite: informe se contém lactose.</p>
            )}
          </div>
        </div>
      </Secao>

      <Secao titulo="Porção e embalagem">
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            <span className={rotulo}>Medida caseira da porção</span>
            <input value={texto.medidaCaseira} onChange={muda("medidaCaseira")} maxLength={60} placeholder="Ex.: 1 pedaço, 2 colheres de sopa" className={`${campo} min-h-11`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          <label>
            <span className={rotulo}>Peso líquido da embalagem</span>
            <input value={texto.pesoLiquido} onChange={muda("pesoLiquido")} placeholder="Ex.: 500 g, 1,2 kg, 900 mL" className={`${campo} min-h-11`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
        </div>
      </Secao>

      <Secao titulo="Conservação e preparo" descricao="Como guardar e como o consumidor prepara ou aquece.">
        <label className="block">
          <span className={rotulo}>Instruções de conservação</span>
          <textarea value={texto.conservacao} onChange={muda("conservacao")} rows={2} className={`${campo} py-2.5`} style={{ borderColor: "var(--linha-forte)" }} />
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Frases prontas de conservação">
          {ATALHOS_CONSERVACAO.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTexto((t) => ({ ...t, conservacao: t.conservacao.includes(f) ? t.conservacao : `${t.conservacao.trim()} ${f}`.trim() }))}
              className="min-h-9 px-2.5 rounded-full border text-[12px] text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
              style={{ borderColor: "var(--linha)" }}
            >
              + {f}
            </button>
          ))}
        </div>
        <label className="block mt-4">
          <span className={rotulo}>Modo de preparo / aquecimento</span>
          <textarea value={texto.modoPreparo} onChange={muda("modoPreparo")} rows={3} maxLength={600} placeholder="Ex.: Forno preaquecido a 200 °C por 45 min, sem descongelar." className={`${campo} py-2.5`} style={{ borderColor: "var(--linha-forte)" }} />
        </label>
      </Secao>

      <Secao titulo="Lista de ingredientes" descricao="Em ordem decrescente de quantidade, gerada da ficha técnica. Ajuste nomes comerciais (ex.: “farinha de trigo enriquecida com ferro e ácido fólico”) se precisar.">
        {ingredientesGerados && (
          <div className="rounded-lg border px-3 py-2.5 mb-2.5 text-[13px] text-[var(--tinta)]" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
            <div className="text-[12px] text-[var(--tinta-faint)] mb-1">Gerada da ficha</div>
            {ingredientesGerados}
          </div>
        )}
        <textarea
          value={texto.ingredientes}
          onChange={muda("ingredientes")}
          rows={3}
          aria-label="Lista de ingredientes do rótulo"
          placeholder={ingredientesGerados ? "Em branco, o rótulo usa a lista gerada acima." : "Ex.: INGREDIENTES: farinha de trigo, água, sal."}
          className={`${campo} py-2.5`}
          style={{ borderColor: "var(--linha-forte)" }}
        />
        {ingredientesGerados && (
          <button type="button" onClick={() => setTexto((t) => ({ ...t, ingredientes: ingredientesGerados }))} className="mt-2 min-h-10 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-1.5" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
            <Wand2 size={14} /> Copiar a lista gerada pra editar
          </button>
        )}
      </Secao>

      <Secao titulo="Fabricante">
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            <span className={rotulo}>Razão social e CNPJ</span>
            <input value={texto.fabricante} onChange={muda("fabricante")} className={`${campo} min-h-11`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          <label>
            <span className={rotulo}>Endereço completo</span>
            <input value={texto.endereco} onChange={muda("endereco")} className={`${campo} min-h-11`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
        </div>
      </Secao>

      <div className="pt-2">
        <button onClick={enviar} disabled={salvando} className="min-h-11 px-5 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          {salvando ? "Salvando…" : "Salvar dados do rótulo"}
        </button>
      </div>
    </div>
  );
}
