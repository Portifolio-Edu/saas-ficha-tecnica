"use client";

import { useEffect, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import { shadow } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";

/** Ficha de produção pra chão de cozinha: foto do prato, ingredientes (sem
 * preço/custo -- isso é da ficha de custos, não daqui) e passo a passo
 * numerado com foto por etapa. Fecha no backdrop, no × ou no Escape. */
export function FichaProducaoModal({
  receita,
  insumos,
  todasReceitas,
  onClose,
}: {
  receita: Receita;
  insumos: Insumo[];
  todasReceitas: Receita[];
  onClose: () => void;
}) {
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ampliada) setAmpliada(false);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ampliada, onClose]);

  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const receitaPorId = new Map(todasReceitas.map((r) => [r.id, r]));
  const etapasOrdenadas = [...receita.etapas].sort((a, b) => a.ordem - b.ordem);

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ background: "rgba(13,13,15,0.45)", zIndex: 50 }}
        onClick={onClose}
      >
        <div
          className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--panel)", boxShadow: shadow }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
            <h3 className="text-[15px] font-semibold">Ficha de produção — {receita.nomePrato}</h3>
            <button onClick={onClose} aria-label="Fechar" style={{ color: "var(--faint)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4">
            {receita.fotoUrl ? (
              <div className="relative mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receita.fotoUrl}
                  alt={receita.nomePrato}
                  className="rounded-lg w-full"
                  style={{ minHeight: 400, objectFit: "cover", width: "100%" }}
                />
                <button
                  onClick={() => setAmpliada(true)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(13,13,15,0.65)", color: "#fff" }}
                >
                  <Maximize2 size={13} /> Ampliar
                </button>
              </div>
            ) : (
              <div
                className="rounded-lg flex items-center justify-center mb-5"
                style={{ minHeight: 400, border: "1px dashed var(--border-strong)", background: "var(--bg)" }}
              >
                <span className="text-[12.5px]" style={{ color: "var(--faint)" }}>Sem foto cadastrada</span>
              </div>
            )}

            <div className="mb-5">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--sub)" }}>
                Ingredientes
              </h4>
              {receita.ficha.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: "var(--faint)" }}>Nenhum ingrediente cadastrado.</p>
              ) : (
                <ul className="space-y-1">
                  {receita.ficha.map((linha) => {
                    const nome = linha.insumoId
                      ? insumoPorId.get(linha.insumoId)?.nome
                      : receitaPorId.get(linha.subReceitaId!)?.nomePrato;
                    return (
                      <li key={linha.id} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={{ background: "var(--bg)" }}>
                        {nome ?? "Item removido"} · {linha.pesoLiquido}{linha.unidade}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--sub)" }}>
                Passo a passo
              </h4>
              {etapasOrdenadas.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: "var(--faint)" }}>Nenhuma etapa cadastrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {etapasOrdenadas.map((etapa, idx) => (
                    <div key={etapa.id} className="flex gap-3 rounded-lg p-3" style={{ background: "var(--bg)" }}>
                      <div
                        className="flex items-center justify-center rounded-full font-semibold shrink-0"
                        style={{ width: 26, height: 26, background: "var(--text)", color: "#fff", fontSize: 12 }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        {etapa.titulo && <div className="text-[13px] font-semibold mb-0.5">{etapa.titulo}</div>}
                        {etapa.texto && <p className="text-[12.5px]" style={{ color: "var(--sub)" }}>{etapa.texto}</p>}
                        {etapa.fotoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={etapa.fotoUrl}
                            alt={etapa.titulo ?? `Etapa ${idx + 1}`}
                            className="rounded-md mt-2"
                            style={{ minHeight: 160, objectFit: "cover", width: "100%" }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {ampliada && receita.fotoUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(13,13,15,0.85)", zIndex: 60 }}
          onClick={() => setAmpliada(false)}
        >
          <button
            onClick={() => setAmpliada(false)}
            aria-label="Fechar visualização ampliada"
            className="absolute top-4 right-4"
            style={{ color: "#fff" }}
          >
            <X size={26} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receita.fotoUrl}
            alt={receita.nomePrato}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
