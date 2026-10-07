"use client";

// POLIMENTO fichas-kanban (2026-10-06): ficha operacional com texto legível,
// cabeçalho fixo e fechar de 44px. Fotos principal/etapas continuam presentes.
// Registro e reversão: docs/melhorias/04-ficha-producao.md.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatQtd } from "@/components/charts/format";
import { unidadeNoPlural } from "@/components/producoes/formato";
import { X, Maximize2 } from "lucide-react";
import { shadow } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";

/** Ficha de produção: padrão de empratamento, ingredientes sem custos e
 * passo a passo com fotos. A ficha financeira e os PDFs continuam separados. */
type FichaProducaoProps = {
  receita: Receita;
  insumos: Insumo[];
  todasReceitas: Receita[];
  onClose: () => void;
};

// AJUSTES prints (2026-10-06): a animação do conteúdo mantém um transform,
// que fazia o modal fixed se posicionar dentro da página longa. O portal
// ancora ficha e foto ampliada na janela. Docs: 06-modal-na-janela.md.
export function FichaProducaoModal(props: FichaProducaoProps) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => setDestino(document.body), []);
  return destino ? createPortal(<ConteudoFichaProducao {...props} />, destino) : null;
}

function ConteudoFichaProducao({
  receita,
  insumos,
  todasReceitas,
  onClose,
}: FichaProducaoProps) {
  const [ampliada, setAmpliada] = useState(false);
  const id = useId();
  const painel = useRef<HTMLDivElement>(null);
  const fotoPainel = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const fecharFoto = useRef<HTMLButtonElement>(null);
  const origemFoto = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fechar.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      antes?.focus();
    };
  }, []);

  useEffect(() => {
    if (ampliada) {
      origemFoto.current = document.activeElement as HTMLElement | null;
      fecharFoto.current?.focus();
    } else if (origemFoto.current) {
      origemFoto.current.focus();
      origemFoto.current = null;
    }
  }, [ampliada]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (ampliada) setAmpliada(false);
        else onClose();
      }
      if (e.key !== "Tab") return;
      const atual = ampliada ? fotoPainel.current : painel.current;
      const alvos = atual?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      );
      if (!alvos?.length) return;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === primeiro ||
          !atual?.contains(document.activeElement))
      ) {
        e.preventDefault();
        ultimo.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === ultimo ||
          !atual?.contains(document.activeElement))
      ) {
        e.preventDefault();
        primeiro.focus();
      }
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
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-4"
        style={{ background: "rgba(13,13,15,0.45)", zIndex: 50 }}
        onClick={onClose}
        aria-hidden={ampliada || undefined}
        inert={ampliada}
      >
        <div
          ref={painel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-titulo`}
          className="rounded-xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto overscroll-contain"
          style={{ background: "var(--panel)", boxShadow: shadow }}
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 sm:px-5 py-3"
            style={{
              background: "var(--panel)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="min-w-0">
              <h3 id={`${id}-titulo`} className="text-[16px] font-semibold">
                Ficha de produção — {receita.nomePrato}
              </h3>
              <p className="text-[13px] mt-1" style={{ color: "var(--sub)" }}>
                Rende {formatQtd(receita.rendimento)}{" "}
                {unidadeNoPlural(receita.rendimento, receita.unidadeRendimento)}
                {receita.pesoPorcaoG
                  ? ` · porção de ${formatQtd(receita.pesoPorcaoG)} g`
                  : ""}
              </p>
            </div>
            <button
              ref={fechar}
              onClick={onClose}
              aria-label="Fechar ficha de produção"
              className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center hover:bg-[var(--panel-hover)]"
              style={{ color: "var(--sub)" }}
            >
              <X size={22} />
            </button>
          </header>

          <div className="px-4 sm:px-5 py-4 space-y-5">
            {receita.fotoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receita.fotoUrl}
                  alt={receita.nomePrato}
                  className="rounded-lg w-full max-h-[50dvh] object-contain"
                  style={{ background: "var(--bg)" }}
                />
                <button
                  onClick={() => setAmpliada(true)}
                  className="absolute bottom-3 right-3 flex items-center gap-2 text-[14px] font-medium px-3 min-h-11 rounded-lg"
                  style={{ background: "rgba(13,13,15,0.75)", color: "#fff" }}
                >
                  <Maximize2 size={16} /> Ampliar foto
                </button>
              </div>
            ) : (
              <div
                className="rounded-lg min-h-32 flex items-center justify-center px-4 text-center"
                style={{
                  border: "1px dashed var(--border-strong)",
                  background: "var(--bg)",
                }}
              >
                <span className="text-[14px]" style={{ color: "var(--sub)" }}>
                  Sem foto cadastrada. Adicione a foto de padronização na edição
                  da ficha.
                </span>
              </div>
            )}

            <section aria-labelledby={`${id}-ingredientes`}>
              <h4
                id={`${id}-ingredientes`}
                className="text-[16px] font-semibold mb-3"
              >
                Ingredientes
              </h4>
              {receita.ficha.length === 0 ? (
                <p className="text-[14px]" style={{ color: "var(--sub)" }}>
                  Nenhum ingrediente cadastrado.
                </p>
              ) : (
                <ul
                  className="rounded-lg overflow-hidden"
                  style={{ background: "var(--bg)" }}
                >
                  {receita.ficha.map((linha, idx) => {
                    const nome = linha.insumoId
                      ? insumoPorId.get(linha.insumoId)?.nome
                      : receitaPorId.get(linha.subReceitaId!)?.nomePrato;
                    return (
                      <li
                        key={linha.id}
                        className={`text-[15px] px-3 py-3 flex justify-between items-start gap-4 ${idx ? "border-t" : ""}`}
                        style={{ borderColor: "var(--border)" }}
                      >
                        <span>
                          {nome ?? "Item removido"}
                          {linha.subReceitaId && (
                            <span
                              className="block text-[12px] mt-0.5"
                              style={{ color: "var(--sub)" }}
                            >
                              preparo próprio
                            </span>
                          )}
                        </span>
                        <span className="font-semibold whitespace-nowrap tabular-nums">
                          {formatQtd(linha.pesoLiquido)} {linha.unidade}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby={`${id}-etapas`}>
              <h4
                id={`${id}-etapas`}
                className="text-[16px] font-semibold mb-3"
              >
                Passo a passo
              </h4>
              {receita.modoPreparo && (
                <p
                  className="text-[15px] leading-relaxed mb-3 whitespace-pre-line"
                  style={{ color: "var(--sub)" }}
                >
                  {receita.modoPreparo}
                </p>
              )}
              {etapasOrdenadas.length === 0 ? (
                !receita.modoPreparo && (
                  <p className="text-[14px]" style={{ color: "var(--sub)" }}>
                    Nenhuma etapa cadastrada ainda.
                  </p>
                )
              ) : (
                <ol className="space-y-3">
                  {etapasOrdenadas.map((etapa, idx) => (
                    <li
                      key={etapa.id}
                      className="flex gap-3 rounded-lg p-4"
                      style={{ background: "var(--bg)" }}
                    >
                      <span
                        className="flex items-center justify-center rounded-full font-semibold shrink-0 w-9 h-9 text-[14px]"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-contrast, #fff)",
                        }}
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {etapa.titulo && (
                          <h5 className="text-[16px] font-semibold mb-1">
                            {etapa.titulo}
                          </h5>
                        )}
                        {etapa.texto && (
                          <p
                            className="text-[15px] leading-relaxed whitespace-pre-line"
                            style={{ color: "var(--sub)" }}
                          >
                            {etapa.texto}
                          </p>
                        )}
                        {etapa.fotoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={etapa.fotoUrl}
                            alt={etapa.titulo ?? `Etapa ${idx + 1}`}
                            className="rounded-lg mt-3 w-full object-contain"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>

      {ampliada && receita.fotoUrl && (
        <div
          ref={fotoPainel}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada: ${receita.nomePrato}`}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(13,13,15,0.92)", zIndex: 60 }}
          onClick={() => setAmpliada(false)}
        >
          <button
            ref={fecharFoto}
            onClick={() => setAmpliada(false)}
            aria-label="Fechar visualização ampliada"
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-lg"
            style={{ color: "#fff", background: "rgba(255,255,255,0.12)" }}
          >
            <X size={26} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receita.fotoUrl}
            alt={receita.nomePrato}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
