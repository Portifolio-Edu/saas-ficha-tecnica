"use client";

// POLIMENTO checklists-pracas (2026-09-22) -- pedido do usuário: dentro de
// Checklists, uma visão por praça/setor com tudo que precisa estar lá pra praça
// ficar completa e fotos de referência da praça montada (várias por praça, uma por
// elemento). Assim a casa mantém a mesma organização mesmo se a equipe inteira
// mudar. Uma praça é um checklist com momento "praca": itens e marcação do turno
// são os mesmos do resto da tela; as fotos ficam em checklist_fotos.
// Pra tirar a visão: remover a aba "Praças" em ChecklistsClient.tsx e este arquivo
// (ou git revert do commit "polimento(checklists-pracas)").

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, ImagePlus, Plus, X } from "lucide-react";
import { reduzirImagem } from "@/lib/imagem/reduzirImagem";
import type { Checklist, ChecklistFoto } from "@/lib/dominio/checklist";

type Resultado = { ok: true } | { ok: false; erro: string };

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;
const campo = "text-[15px] px-3 min-h-[var(--alvo-toque)] rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";

export function PracasView({
  pracas,
  onAlternarItem,
  onAdicionarItem,
  onRemoverItem,
  onCriarPraca,
  onExcluirPraca,
  onAdicionarFoto,
  onRemoverFoto,
}: {
  pracas: Checklist[];
  onAlternarItem: (itemId: string, concluidoHoje: boolean) => void;
  onAdicionarItem: (checklistId: string, texto: string, ordem: number) => Promise<boolean>;
  onRemoverItem: (itemId: string) => void;
  onCriarPraca: (nome: string) => Promise<boolean>;
  onExcluirPraca: (praca: Checklist) => void;
  onAdicionarFoto: (checklistId: string, arquivo: File, legenda: string | null, ordem: number) => Promise<Resultado>;
  onRemoverFoto: (checklistId: string, fotoId: string) => void;
}) {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const aberta = pracas.find((p) => p.id === abertaId) ?? null;

  // Se a praça aberta foi excluída, volta pra lista.
  useEffect(() => {
    if (abertaId && !aberta) setAbertaId(null);
  }, [abertaId, aberta]);

  if (aberta) {
    return <DetalhePraca praca={aberta} onVoltar={() => setAbertaId(null)} {...{ onAlternarItem, onAdicionarItem, onRemoverItem, onExcluirPraca, onAdicionarFoto, onRemoverFoto }} />;
  }

  const criar = async () => {
    if (!novoNome.trim()) return;
    if (await onCriarPraca(novoNome.trim())) {
      setNovoNome("");
      setCriando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[var(--tinta-sub)] max-w-2xl">
          Cada praça ou setor com tudo o que precisa estar montado e a foto de como deve ficar. Quem chegar na equipe monta igual.
        </p>
        <button
          onClick={() => setCriando(!criando)}
          className="flex items-center gap-2 text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border"
          style={{
            background: criando ? "var(--panel)" : "var(--accent)",
            color: criando ? "var(--tinta)" : "var(--accent-contrast)",
            borderColor: criando ? "var(--linha-forte)" : "var(--accent)",
          }}
        >
          {!criando && <Plus size={16} />}
          {criando ? "Fechar" : "Nova praça"}
        </button>
      </div>

      {criando && (
        <div className="rounded-xl border p-4 flex flex-wrap gap-2" style={painel}>
          <input
            autoFocus
            placeholder="Nome da praça ou setor (ex.: Praça de massas, Bar, Sobremesas)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            className={`${campo} flex-1 min-w-64`}
            style={{ borderColor: "var(--linha-forte)" }}
          />
          <button onClick={criar} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            Criar praça
          </button>
        </div>
      )}

      {pracas.length === 0 ? (
        <div className="rounded-xl border px-5 py-10 text-center text-[14px] text-[var(--tinta-sub)]" style={painel}>
          Nenhuma praça cadastrada ainda. Crie a primeira e liste o que precisa estar nela.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pracas.map((p) => {
            const prontos = p.itens.filter((i) => i.concluidoHoje).length;
            const total = p.itens.length;
            const completa = total > 0 && prontos === total;
            const capa = p.fotos[0];
            return (
              <button
                key={p.id}
                onClick={() => setAbertaId(p.id)}
                className="text-left rounded-xl border overflow-hidden transition-colors hover:border-[var(--linha-forte)] focus-visible:outline-none"
                style={painel}
              >
                <div className="aspect-[16/9] w-full flex items-center justify-center" style={{ background: "var(--panel-elevated)" }}>
                  {capa ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={capa.url} alt={capa.legenda ?? `Praça ${p.nome} montada`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-[13px] text-[var(--tinta-faint)]">
                      <Camera size={22} strokeWidth={1.6} />
                      Sem foto de referência
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-semibold text-[var(--tinta)]">{p.nome}</span>
                    <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: completa ? "var(--sucesso)" : "var(--tinta)" }}>
                      {prontos} de {total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full mt-2.5" style={{ background: "var(--panel-elevated)" }} aria-hidden>
                    <div className="h-full rounded-full" style={{ width: total ? `${(prontos / total) * 100}%` : "0%", background: completa ? "var(--sucesso)" : "var(--tinta)" }} />
                  </div>
                  <div className="text-[13px] text-[var(--tinta-faint)] mt-2.5">
                    {completa ? "Praça completa" : `${total - prontos} ${total - prontos === 1 ? "item faltando" : "itens faltando"}`} ·{" "}
                    {p.fotos.length === 0 ? "sem foto" : p.fotos.length === 1 ? "1 foto" : `${p.fotos.length} fotos`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetalhePraca({
  praca,
  onVoltar,
  onAlternarItem,
  onAdicionarItem,
  onRemoverItem,
  onExcluirPraca,
  onAdicionarFoto,
  onRemoverFoto,
}: {
  praca: Checklist;
  onVoltar: () => void;
  onAlternarItem: (itemId: string, concluidoHoje: boolean) => void;
  onAdicionarItem: (checklistId: string, texto: string, ordem: number) => Promise<boolean>;
  onRemoverItem: (itemId: string) => void;
  onExcluirPraca: (praca: Checklist) => void;
  onAdicionarFoto: (checklistId: string, arquivo: File, legenda: string | null, ordem: number) => Promise<Resultado>;
  onRemoverFoto: (checklistId: string, fotoId: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<{ arquivo: File; preview: string } | null>(null);
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prontos = praca.itens.filter((i) => i.concluidoHoje).length;
  const total = praca.itens.length;
  const completa = total > 0 && prontos === total;

  useEffect(() => () => {
    if (rascunho) URL.revokeObjectURL(rascunho.preview);
  }, [rascunho]);

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErroFoto(null);
    setLegenda("");
    setRascunho({ arquivo, preview: URL.createObjectURL(arquivo) });
  };

  const enviarFoto = async () => {
    if (!rascunho) return;
    setEnviando(true);
    setErroFoto(null);
    const arquivo = await reduzirImagem(rascunho.arquivo);
    const r = await onAdicionarFoto(praca.id, arquivo, legenda.trim() || null, praca.fotos.length);
    setEnviando(false);
    if (r.ok) setRascunho(null);
    else setErroFoto(r.erro);
  };

  const adicionarItem = async () => {
    if (!novoItem.trim()) return;
    if (await onAdicionarItem(praca.id, novoItem.trim(), praca.itens.length + 1)) setNovoItem("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onVoltar}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)] shrink-0"
            aria-label="Voltar pra todas as praças"
            title="Todas as praças"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0">
            <h3 className="text-[20px] font-semibold tracking-tight text-[var(--tinta)] truncate">{praca.nome}</h3>
            <div className="text-[13px]" style={{ color: completa ? "var(--sucesso)" : "var(--tinta-faint)" }}>
              {completa ? "Praça completa" : `${prontos} de ${total} itens prontos`}
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border hover:bg-[var(--panel-hover)]"
          style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
        >
          {editando ? "Pronto" : "Editar praça"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Fotos de referência */}
        <section className="rounded-xl border overflow-hidden" style={painel} aria-labelledby={`fotos-${praca.id}`}>
          <div className="px-5 pt-4 pb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 id={`fotos-${praca.id}`} className="text-[16px] font-semibold text-[var(--tinta)]">Como a praça fica montada</h4>
              <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">Uma foto por elemento: bancada, geladeira de apoio, forno. Toque pra ampliar.</p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={escolherArquivo} />
            {!rascunho && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 text-[14px] font-medium px-3.5 min-h-[var(--alvo-toque)] rounded-lg border hover:bg-[var(--panel-hover)]"
                style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
              >
                <ImagePlus size={16} />
                Adicionar foto
              </button>
            )}
          </div>

          {rascunho && (
            <div className="mx-5 mb-4 rounded-lg border p-3 flex flex-col sm:flex-row gap-3" style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rascunho.preview} alt="Prévia da foto escolhida" className="w-full sm:w-36 aspect-[4/3] object-cover rounded-md" />
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[13px] text-[var(--tinta-sub)]" htmlFor={`legenda-${praca.id}`}>
                  O que aparece na foto
                </label>
                <input
                  id={`legenda-${praca.id}`}
                  autoFocus
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !enviando && enviarFoto()}
                  placeholder="Ex.: Bancada de montagem, vista de frente"
                  className={campo}
                  style={{ borderColor: "var(--linha-forte)" }}
                />
                {erroFoto && (
                  <div role="alert" className="text-[13px] rounded-md px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                    {erroFoto}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={enviarFoto}
                    disabled={enviando}
                    className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg"
                    style={{ background: "var(--accent)", color: "var(--accent-contrast)", opacity: enviando ? 0.6 : 1 }}
                  >
                    {enviando ? "Enviando..." : "Salvar foto"}
                  </button>
                  <button
                    onClick={() => setRascunho(null)}
                    disabled={enviando}
                    className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border"
                    style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {praca.fotos.length === 0 && !rascunho ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="mx-5 mb-5 w-[calc(100%-2.5rem)] aspect-[16/9] rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 text-[14px] text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]"
              style={{ borderColor: "var(--linha-forte)" }}
            >
              <Camera size={24} strokeWidth={1.6} />
              Fotografe a praça montada do jeito certo
              <span className="text-[13px] text-[var(--tinta-faint)]">Quem chegar depois monta igual</span>
            </button>
          ) : (
            <ul className="px-5 pb-5 grid grid-cols-2 gap-3">
              {praca.fotos.map((f, i) => (
                <li key={f.id} className="relative">
                  <button onClick={() => setAmpliada(i)} className="block w-full text-left" aria-label={`Ampliar foto${f.legenda ? `: ${f.legenda}` : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.legenda ?? `Foto ${i + 1} da praça ${praca.nome}`} className="w-full aspect-[4/3] object-cover rounded-lg border" style={{ borderColor: "var(--linha)" }} />
                    <span className="block text-[13px] text-[var(--tinta-sub)] mt-1.5 line-clamp-2">{f.legenda || "Sem legenda"}</span>
                  </button>
                  {editando && (
                    <button
                      onClick={() => {
                        if (window.confirm("Remover esta foto de referência?")) onRemoverFoto(praca.id, f.id);
                      }}
                      className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-lg"
                      style={{ background: "var(--panel)", color: "var(--danger)", boxShadow: "var(--shadow-sm)" }}
                      aria-label={`Remover foto${f.legenda ? ` "${f.legenda}"` : ""}`}
                    >
                      <X size={17} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* O que precisa estar na praça */}
        <section className="rounded-xl border overflow-hidden" style={painel} aria-labelledby={`itens-${praca.id}`}>
          <div className="px-5 pt-4 pb-3">
            <h4 id={`itens-${praca.id}`} className="text-[16px] font-semibold text-[var(--tinta)]">O que precisa estar na praça</h4>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">Marque conforme monta. Fica registrado no turno e no responsável lá de cima.</p>
            <div className="h-1.5 rounded-full mt-3" style={{ background: "var(--panel-elevated)" }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={prontos} aria-label={`${praca.nome}: ${prontos} de ${total}`}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: total ? `${(prontos / total) * 100}%` : "0%", background: completa ? "var(--sucesso)" : "var(--tinta)" }} />
            </div>
          </div>
          <ul className="border-t divide-y" style={{ borderColor: "var(--linha)" }}>
            {praca.itens.map((item) => (
              <li key={item.id} style={{ borderColor: "var(--linha)" }}>
                {editando ? (
                  <div className="flex items-center gap-3 px-5 min-h-12">
                    <span className="text-[15px] flex-1 text-[var(--tinta-sub)]">{item.texto}</span>
                    <button onClick={() => onRemoverItem(item.id)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--danger)" }} aria-label={`Remover "${item.texto}"`}>
                      <X size={17} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAlternarItem(item.id, item.concluidoHoje)}
                    role="checkbox"
                    aria-checked={item.concluidoHoje}
                    className="flex items-center gap-3.5 text-left w-full px-5 min-h-12 py-2 hover:bg-[var(--panel-hover)] transition-colors"
                  >
                    <span
                      className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center border-[1.5px] transition-colors"
                      style={{ borderColor: item.concluidoHoje ? "var(--sucesso)" : "var(--linha-forte)", background: item.concluidoHoje ? "var(--sucesso)" : "var(--panel)" }}
                      aria-hidden
                    >
                      {item.concluidoHoje && <Check size={15} strokeWidth={3} color="var(--panel)" />}
                    </span>
                    <span className="text-[15px]" style={{ color: item.concluidoHoje ? "var(--tinta-faint)" : "var(--tinta)", textDecoration: item.concluidoHoje ? "line-through" : "none" }}>
                      {item.texto}
                    </span>
                  </button>
                )}
              </li>
            ))}
            {praca.itens.length === 0 && <li className="px-5 py-4 text-[14px] text-[var(--tinta-faint)]">Sem itens ainda. Toque em Editar praça pra listar o que precisa estar aqui.</li>}
          </ul>
          {editando && (
            <div className="flex flex-wrap gap-2 p-4 border-t" style={{ borderColor: "var(--linha)" }}>
              <input
                placeholder="Ex.: Molho de tomate em 2 cubas 1/6"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarItem()}
                className={`${campo} flex-1 min-w-48`}
                style={{ borderColor: "var(--linha-forte)" }}
              />
              <button onClick={adicionarItem} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                Adicionar
              </button>
              <button onClick={() => onExcluirPraca(praca)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border" style={{ color: "var(--danger)", borderColor: "var(--linha-forte)" }}>
                Excluir praça
              </button>
            </div>
          )}
        </section>
      </div>

      {ampliada !== null && praca.fotos[ampliada] && (
        <Ampliada fotos={praca.fotos} indice={ampliada} onTrocar={setAmpliada} onFechar={() => setAmpliada(null)} />
      )}
    </div>
  );
}

function Ampliada({ fotos, indice, onTrocar, onFechar }: { fotos: ChecklistFoto[]; indice: number; onTrocar: (i: number) => void; onFechar: () => void }) {
  const foto = fotos[indice];
  const anterior = () => onTrocar((indice - 1 + fotos.length) % fotos.length);
  const proxima = () => onTrocar((indice + 1) % fotos.length);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.88)" }} role="dialog" aria-modal="true" aria-label={foto.legenda ?? "Foto da praça"}>
      <div className="flex items-center justify-between gap-3 px-4 h-16 shrink-0 text-white">
        <span className="text-[15px] truncate">
          {foto.legenda || "Sem legenda"}
          <span className="text-white/60 ml-2">
            {indice + 1} de {fotos.length}
          </span>
        </span>
        <button onClick={onFechar} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center gap-2 px-2 pb-6">
        {fotos.length > 1 && (
          <button onClick={anterior} className="w-12 h-12 flex items-center justify-center rounded-lg text-white hover:bg-white/10 shrink-0" aria-label="Foto anterior">
            <ChevronLeft size={26} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={foto.legenda ?? "Foto da praça"} className="max-h-full max-w-full object-contain rounded-md" />
        {fotos.length > 1 && (
          <button onClick={proxima} className="w-12 h-12 flex items-center justify-center rounded-lg text-white hover:bg-white/10 shrink-0" aria-label="Próxima foto">
            <ChevronRight size={26} />
          </button>
        )}
      </div>
    </div>
  );
}
