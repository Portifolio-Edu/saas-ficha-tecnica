"use client";

// POLIMENTO checklists-pracas (2026-09-22) -- pedido do usuário: dentro de
// Checklists, uma visão por praça/setor com tudo que precisa estar lá pra praça
// ficar completa e fotos de referência da praça montada. Assim a casa mantém a
// mesma organização mesmo se a equipe inteira mudar.
//
// POLIMENTO pracas-areas (2026-09-23) -- segundo pedido: uma praça engloba várias
// áreas (pista fria, bancada de montagem, geladeira, pista quente...). Cada área
// tem as próprias fotos (quantas precisar) e a própria lista; o cliente cria
// quantas praças e áreas quiser, com o nome que quiser, e renomeia depois.
// Item/foto sem área aparece em "Geral". Versão sem áreas:
//   git show 80452ce:src/components/checklists/PracasView.tsx
// Pra tirar a visão inteira: remover a aba "Praças" em ChecklistsClient.tsx.

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { reduzirImagem } from "@/lib/imagem/reduzirImagem";
import type { Checklist, ChecklistArea, ChecklistFoto, ChecklistItem } from "@/lib/dominio/checklist";

type Resultado = { ok: true } | { ok: false; erro: string };

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;
const campo = "text-[15px] px-3 min-h-[var(--alvo-toque)] rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";
const botaoPrimario = { background: "var(--accent)", color: "var(--accent-contrast)" } as const;
const botaoSecundario = { borderColor: "var(--linha-forte)", color: "var(--tinta)" } as const;

// Sugestões pra criar área com um toque; o nome é livre.
const SUGESTOES_AREA = ["Pista fria", "Pista quente", "Bancada de montagem", "Geladeira de apoio", "Forno", "Estoque do dia"];

interface Acoes {
  onAlternarItem: (itemId: string, concluidoHoje: boolean) => void;
  onAdicionarItem: (checklistId: string, texto: string, ordem: number, areaId: string | null) => Promise<boolean>;
  onRemoverItem: (itemId: string) => void;
  onExcluirPraca: (praca: Checklist) => void;
  onAdicionarFoto: (checklistId: string, arquivo: File, legenda: string | null, ordem: number, areaId: string | null) => Promise<Resultado>;
  onRemoverFoto: (checklistId: string, fotoId: string) => void;
  onRenomearPraca: (checklistId: string, nome: string) => Promise<boolean>;
  onCriarArea: (checklistId: string, nome: string, ordem: number) => Promise<boolean>;
  onRenomearArea: (checklistId: string, areaId: string, nome: string) => Promise<boolean>;
  onExcluirArea: (checklistId: string, areaId: string) => void;
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function PracasView({ pracas, onCriarPraca, ...acoes }: { pracas: Checklist[]; onCriarPraca: (nome: string) => Promise<boolean> } & Acoes) {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const aberta = pracas.find((p) => p.id === abertaId) ?? null;

  // Se a praça aberta foi excluída, volta pra lista.
  useEffect(() => {
    if (abertaId && !aberta) setAbertaId(null);
  }, [abertaId, aberta]);

  if (aberta) return <DetalhePraca praca={aberta} onVoltar={() => setAbertaId(null)} {...acoes} />;

  const criar = async () => {
    if (!novoNome.trim()) return;
    const nome = novoNome.trim();
    if (await onCriarPraca(nome)) {
      setNovoNome("");
      setCriando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[var(--tinta-sub)] max-w-2xl">
          Cada praça dividida nas áreas que ela tem, com a foto de como cada uma fica montada e o que precisa estar lá. Quem chegar na equipe monta igual.
        </p>
        <button
          onClick={() => setCriando(!criando)}
          className="flex items-center gap-2 text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border"
          style={criando ? { ...botaoSecundario, background: "var(--panel)" } : { ...botaoPrimario, borderColor: "var(--accent)" }}
        >
          {!criando && <Plus size={16} />}
          {criando ? "Fechar" : "Nova praça"}
        </button>
      </div>

      {criando && (
        <div className="rounded-xl border p-4 flex flex-wrap gap-2" style={painel}>
          <input
            autoFocus
            placeholder="Nome da praça (ex.: Praça de massas, Bar, Confeitaria, Parrilla)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            maxLength={80}
            className={`${campo} flex-1 min-w-64`}
            style={{ borderColor: "var(--linha-forte)" }}
          />
          <button onClick={criar} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={botaoPrimario}>
            Criar praça
          </button>
        </div>
      )}

      {pracas.length === 0 ? (
        <div className="rounded-xl border px-5 py-10 text-center text-[14px] text-[var(--tinta-sub)]" style={painel}>
          Nenhuma praça cadastrada ainda. Crie a primeira com o nome que a sua cozinha usa.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {pracas.map((p) => {
            const prontos = p.itens.filter((i) => i.concluidoHoje).length;
            const total = p.itens.length;
            const completa = total > 0 && prontos === total;
            const capa = p.fotos[0];
            return (
              <button key={p.id} onClick={() => setAbertaId(p.id)} className="text-left rounded-xl border overflow-hidden transition-colors hover:border-[var(--linha-forte)]" style={painel}>
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
                    {completa ? "Praça completa" : total ? `${plural(total - prontos, "item faltando", "itens faltando")}` : "Sem itens ainda"} · {plural(p.areas.length, "área", "áreas")} ·{" "}
                    {p.fotos.length === 0 ? "sem foto" : plural(p.fotos.length, "foto", "fotos")}
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

function DetalhePraca({ praca, onVoltar, ...acoes }: { praca: Checklist; onVoltar: () => void } & Acoes) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(praca.nome);
  const [novaArea, setNovaArea] = useState("");

  useEffect(() => setNome(praca.nome), [praca.nome]);

  const prontos = praca.itens.filter((i) => i.concluidoHoje).length;
  const total = praca.itens.length;
  const completa = total > 0 && prontos === total;

  const areas = [...praca.areas].sort((a, b) => a.ordem - b.ordem);
  const idsAreas = new Set(areas.map((a) => a.id));
  // Sem área (ou área que não existe mais) cai em "Geral".
  const semArea = (x: { areaId: string | null }) => !x.areaId || !idsAreas.has(x.areaId);
  const itensGerais = praca.itens.filter(semArea);
  const fotosGerais = praca.fotos.filter(semArea);

  const salvarNome = async () => {
    const n = nome.trim();
    if (!n || n === praca.nome) {
      setNome(praca.nome);
      return;
    }
    if (!(await acoes.onRenomearPraca(praca.id, n))) setNome(praca.nome);
  };

  const criarArea = async (nomeArea: string) => {
    const n = nomeArea.trim();
    if (!n) return;
    if (await acoes.onCriarArea(praca.id, n, areas.length + 1)) setNovaArea("");
  };

  const sugestoesLivres = SUGESTOES_AREA.filter((s) => !areas.some((a) => a.nome.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onVoltar}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)] shrink-0"
            aria-label="Voltar pra todas as praças"
            title="Todas as praças"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            {editando ? (
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={salvarNome}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                maxLength={80}
                aria-label="Nome da praça"
                className={`${campo} w-full max-w-md text-[18px] font-semibold`}
                style={{ borderColor: "var(--linha-forte)" }}
              />
            ) : (
              <h3 className="text-[20px] font-semibold tracking-tight text-[var(--tinta)] truncate">{praca.nome}</h3>
            )}
            <div className="text-[13px] mt-0.5" style={{ color: completa ? "var(--sucesso)" : "var(--tinta-faint)" }}>
              {completa ? "Praça completa" : total ? `${prontos} de ${total} itens prontos` : "Sem itens ainda"} · {plural(areas.length, "área", "áreas")} · {plural(praca.fotos.length, "foto", "fotos")}
            </div>
          </div>
        </div>
        <button onClick={() => setEditando(!editando)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border hover:bg-[var(--panel-hover)]" style={botaoSecundario}>
          {editando ? "Pronto" : "Editar praça"}
        </button>
      </div>

      {areas.length === 0 && itensGerais.length === 0 && fotosGerais.length === 0 && (
        <div className="rounded-xl border p-5" style={painel}>
          <h4 className="text-[16px] font-semibold text-[var(--tinta)]">Divida a praça nas áreas que ela tem</h4>
          <p className="text-[14px] text-[var(--tinta-sub)] mt-1">Em cada área você coloca a foto de como ela fica montada e o que precisa estar lá.</p>
          <NovaArea valor={novaArea} onValor={setNovaArea} onCriar={criarArea} sugestoes={sugestoesLivres} />
        </div>
      )}

      {areas.map((a) => (
        <BlocoArea
          key={a.id}
          praca={praca}
          area={a}
          itens={praca.itens.filter((i) => i.areaId === a.id)}
          fotos={praca.fotos.filter((f) => f.areaId === a.id)}
          editando={editando}
          {...acoes}
        />
      ))}

      {(itensGerais.length > 0 || fotosGerais.length > 0) && (
        <BlocoArea praca={praca} area={null} itens={itensGerais} fotos={fotosGerais} editando={editando} {...acoes} />
      )}

      {editando && (
        <div className="rounded-xl border p-5 space-y-4" style={painel}>
          {(areas.length > 0 || itensGerais.length > 0) && (
            <div>
              <h4 className="text-[16px] font-semibold text-[var(--tinta)]">Nova área nesta praça</h4>
              <NovaArea valor={novaArea} onValor={setNovaArea} onCriar={criarArea} sugestoes={sugestoesLivres} />
            </div>
          )}
          <div className="pt-4 border-t" style={{ borderColor: "var(--linha)" }}>
            <button onClick={() => acoes.onExcluirPraca(praca)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border" style={{ color: "var(--danger)", borderColor: "var(--linha-forte)" }}>
              Excluir praça
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NovaArea({ valor, onValor, onCriar, sugestoes }: { valor: string; onValor: (v: string) => void; onCriar: (nome: string) => void; sugestoes: string[] }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Nome da área (ex.: Pista fria, Bancada de montagem)"
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCriar(valor)}
          maxLength={80}
          className={`${campo} flex-1 min-w-56`}
          style={{ borderColor: "var(--linha-forte)" }}
        />
        <button onClick={() => onCriar(valor)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={botaoPrimario}>
          Criar área
        </button>
      </div>
      {sugestoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[var(--tinta-faint)]">Mais comuns:</span>
          {sugestoes.map((s) => (
            <button
              key={s}
              onClick={() => onCriar(s)}
              className="flex items-center gap-1.5 text-[14px] px-3 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
            >
              <Plus size={14} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlocoArea({
  praca,
  area,
  itens,
  fotos,
  editando,
  onAlternarItem,
  onAdicionarItem,
  onRemoverItem,
  onAdicionarFoto,
  onRemoverFoto,
  onRenomearArea,
  onExcluirArea,
}: {
  praca: Checklist;
  /** null = "Geral" (itens e fotos sem área). */
  area: ChecklistArea | null;
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
  editando: boolean;
} & Acoes) {
  const nomeArea = area?.nome ?? "Geral";
  const [nome, setNome] = useState(nomeArea);
  const [novoItem, setNovoItem] = useState("");
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState<{ arquivo: File; preview: string } | null>(null);
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idBase = `${praca.id}-${area?.id ?? "geral"}`;

  useEffect(() => setNome(nomeArea), [nomeArea]);
  useEffect(
    () => () => {
      if (rascunho) URL.revokeObjectURL(rascunho.preview);
    },
    [rascunho],
  );

  const prontos = itens.filter((i) => i.concluidoHoje).length;
  const completa = itens.length > 0 && prontos === itens.length;
  const areaId = area?.id ?? null;

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
    const r = await onAdicionarFoto(praca.id, arquivo, legenda.trim() || null, praca.fotos.length + 1, areaId);
    setEnviando(false);
    if (r.ok) setRascunho(null);
    else setErroFoto(r.erro);
  };

  const adicionarItem = async () => {
    if (!novoItem.trim()) return;
    if (await onAdicionarItem(praca.id, novoItem.trim(), praca.itens.length + 1, areaId)) setNovoItem("");
  };

  const salvarNome = async () => {
    if (!area) return;
    const n = nome.trim();
    if (!n || n === area.nome) {
      setNome(area.nome);
      return;
    }
    if (!(await onRenomearArea(praca.id, area.id, n))) setNome(area.nome);
  };

  const excluir = () => {
    if (!area) return;
    const partes = [itens.length ? plural(itens.length, "item", "itens") : "", fotos.length ? plural(fotos.length, "foto", "fotos") : ""].filter(Boolean).join(" e ");
    if (window.confirm(`Apagar a área "${area.nome}"${partes ? ` com ${partes}` : ""}?`)) onExcluirArea(praca.id, area.id);
  };

  return (
    <section className="rounded-xl border overflow-hidden" style={painel} aria-labelledby={`titulo-${idBase}`}>
      <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
        <div className="min-w-0 flex-1">
          {editando && area ? (
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={salvarNome}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              maxLength={80}
              aria-label="Nome da área"
              className={`${campo} w-full max-w-sm font-semibold`}
              style={{ borderColor: "var(--linha-forte)" }}
            />
          ) : (
            <h4 id={`titulo-${idBase}`} className="text-[17px] font-semibold text-[var(--tinta)]">
              {nomeArea}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: completa ? "var(--sucesso)" : "var(--tinta-sub)" }}>
            {itens.length ? `${prontos} de ${itens.length}` : "sem itens"}
          </span>
          {editando && area && (
            <button onClick={excluir} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--danger)" }} aria-label={`Apagar a área ${area.nome}`} title="Apagar área">
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Fotos da área */}
        <div className="p-5 lg:border-r" style={{ borderColor: "var(--linha)" }}>
          <input ref={inputRef} type="file" aria-label="Foto da praça" accept="image/*" className="hidden" onChange={escolherArquivo} />
          {rascunho ? (
            <div className="rounded-lg border p-3 flex flex-col sm:flex-row gap-3" style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rascunho.preview} alt="Prévia da foto escolhida" className="w-full sm:w-36 aspect-[4/3] object-cover rounded-md" />
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[13px] text-[var(--tinta-sub)]" htmlFor={`legenda-${idBase}`}>
                  Detalhe da foto (opcional)
                </label>
                <input
                  id={`legenda-${idBase}`}
                  autoFocus
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !enviando && enviarFoto()}
                  placeholder="Ex.: vista de cima, prateleira de baixo"
                  className={campo}
                  style={{ borderColor: "var(--linha-forte)" }}
                />
                {erroFoto && (
                  <div role="alert" className="text-[13px] rounded-md px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                    {erroFoto}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={enviarFoto} disabled={enviando} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ ...botaoPrimario, opacity: enviando ? 0.6 : 1 }}>
                    {enviando ? "Enviando..." : "Salvar foto"}
                  </button>
                  <button onClick={() => setRascunho(null)} disabled={enviando} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {fotos.map((f, i) => (
                <li key={f.id} className="relative">
                  <button onClick={() => setAmpliada(i)} className="block w-full text-left" aria-label={`Ampliar foto de ${nomeArea}${f.legenda ? `: ${f.legenda}` : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.legenda ?? `${nomeArea}, foto ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-lg border" style={{ borderColor: "var(--linha)" }} />
                    {f.legenda && <span className="block text-[13px] text-[var(--tinta-sub)] mt-1.5 line-clamp-2">{f.legenda}</span>}
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
              <li className={fotos.length === 0 ? "col-span-2" : ""}>
                <button
                  onClick={() => inputRef.current?.click()}
                  className={`w-full ${fotos.length === 0 ? "aspect-[16/7]" : "aspect-[4/3]"} rounded-lg border border-dashed flex flex-col items-center justify-center gap-1.5 text-[14px] text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]`}
                  style={{ borderColor: "var(--linha-forte)" }}
                >
                  {fotos.length === 0 ? <Camera size={22} strokeWidth={1.6} /> : <ImagePlus size={20} strokeWidth={1.6} />}
                  {fotos.length === 0 ? `Foto de ${nomeArea.toLowerCase()} montada` : "Mais uma foto"}
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* O que precisa estar na área */}
        <div className="border-t lg:border-t-0" style={{ borderColor: "var(--linha)" }}>
          <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
            {itens.map((item) => (
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
            {itens.length === 0 && !editando && <li className="px-5 py-4 text-[14px] text-[var(--tinta-faint)]">Nada listado ainda. Toque em Editar praça pra dizer o que precisa estar aqui.</li>}
          </ul>
          {editando && (
            <div className="flex flex-wrap gap-2 p-4 border-t" style={{ borderColor: "var(--linha)" }}>
              <input
                placeholder="Ex.: Molho de tomate em 2 cubas 1/6"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarItem()}
                aria-label={`Novo item em ${nomeArea}`}
                className={`${campo} flex-1 min-w-48`}
                style={{ borderColor: "var(--linha-forte)" }}
              />
              <button onClick={adicionarItem} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={botaoPrimario}>
                Adicionar
              </button>
            </div>
          )}
        </div>
      </div>

      {ampliada !== null && fotos[ampliada] && <Ampliada titulo={nomeArea} fotos={fotos} indice={ampliada} onTrocar={setAmpliada} onFechar={() => setAmpliada(null)} />}
    </section>
  );
}

function Ampliada({ titulo, fotos, indice, onTrocar, onFechar }: { titulo: string; fotos: ChecklistFoto[]; indice: number; onTrocar: (i: number) => void; onFechar: () => void }) {
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

  const rotulo = foto.legenda ? `${titulo} · ${foto.legenda}` : titulo;
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.88)" }} role="dialog" aria-modal="true" aria-label={rotulo}>
      <div className="flex items-center justify-between gap-3 px-4 h-16 shrink-0 text-white">
        <span className="text-[15px] truncate">
          {rotulo}
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
        <img src={foto.url} alt={rotulo} className="max-h-full max-w-full object-contain rounded-md" />
        {fotos.length > 1 && (
          <button onClick={proxima} className="w-12 h-12 flex items-center justify-center rounded-lg text-white hover:bg-white/10 shrink-0" aria-label="Próxima foto">
            <ChevronRight size={26} />
          </button>
        )}
      </div>
    </div>
  );
}
