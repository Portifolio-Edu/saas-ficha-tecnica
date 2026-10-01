"use client";

// SISTEMA premium (2026-09-22) -- tela do chef na bancada, no padrão Toast/Square
// (alvos grandes) com o acabamento do resto do sistema. Itens viraram linhas de 48px
// com texto de 15px e caixa de 24px (antes 12px e caixa de 14px, inviável no dedo);
// turno, responsável e botões com 44px. Só a apresentação mudou: estado da demo,
// server actions e regras continuam iguais. Versão anterior:
// `git show 4f29ec6:src/app/checklists/ChecklistsClient.tsx`.
//
// POLIMENTO checklists-pracas (2026-09-22): abas "Checklists do turno" e "Praças".
// Praças são checklists com momento "praca" (itens da praça completa + fotos de
// referência), desenhados em components/checklists/PracasView.tsx. A aba de turno
// mostra os outros momentos. Versão anterior: `git show 38b1401:src/app/checklists/ChecklistsClient.tsx`.

import { useEffect, useState } from "react";
import { CHAVES_DEMO, gravarDemo, lerDemo } from "@/lib/demo/armazem";
import { usePathname } from "next/navigation";
import { X, Check, Plus } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { nums } from "@/components/ficha/tema";
import { useToast } from "@/components/ficha/Toast";
import type { Checklist, MomentoChecklist } from "@/lib/dominio/checklist";
import { MOMENTOS } from "@/lib/dominio/checklist";
import type { Turno } from "@/lib/dominio/producao";
import { PracasView } from "@/components/checklists/PracasView";
import {
  acaoCriarChecklist,
  acaoExcluirChecklist,
  acaoCriarItem,
  acaoRemoverItem,
  acaoAlternarItem,
  acaoAdicionarFotoPraca,
  acaoRemoverFotoPraca,
  acaoRenomearChecklist,
  acaoCriarArea,
  acaoRenomearArea,
  acaoRemoverArea,
} from "./actions";

const MOMENTOS_DE_TURNO = MOMENTOS.filter((m) => m.id !== "praca");

export function ChecklistsClient({ checklists, turnos }: { checklists: Checklist[]; turnos: Turno[] }) {
  const pathname = usePathname();
  const emModoDemo = pathname?.startsWith("/preview");
  // Estado local só existe na demo (/preview), que não tem banco. Fora dela a
  // lista vem das props: a server action revalida a rota e o servidor manda a
  // versão gravada -- um useState inicializado das props ficaria congelado.
  const [listaDemo, setListaInterna] = useState<Checklist[]>(checklists);
  const listaChecklists = emModoDemo ? listaDemo : checklists;

  // DEMO (2026-09-25): a lista da demo vive no "banco" da demo
  // (src/lib/demo/armazem.ts), compartilhado com o modo cozinha: item marcado
  // no tablet aparece aqui e vice-versa. Antes ficava só no estado desta tela.
  useEffect(() => {
    if (!emModoDemo) return;
    const carregar = () => setListaInterna(lerDemo(CHAVES_DEMO.checklists, checklists));
    carregar();
    const escutar = (e: StorageEvent) => {
      if (!e.key || e.key === CHAVES_DEMO.checklists) carregar();
    };
    window.addEventListener("storage", escutar);
    return () => window.removeEventListener("storage", escutar);
  }, [emModoDemo, checklists]);

  const setListaChecklists = (atualizar: Checklist[] | ((prev: Checklist[]) => Checklist[])) => {
    const novo = typeof atualizar === "function" ? atualizar(lerDemo(CHAVES_DEMO.checklists, listaDemo)) : atualizar;
    setListaInterna(novo);
    gravarDemo(CHAVES_DEMO.checklists, novo);
  };

  const [turnoId, setTurnoId] = useState<string | null>(turnos[0]?.id ?? null);
  const [chefeTurno, setChefeTurno] = useState("");
  const [showNovoChecklist, setShowNovoChecklist] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoMomento, setNovoMomento] = useState<MomentoChecklist>("abertura");
  const [aba, setAba] = useState<"turno" | "pracas">("turno");
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [editandoChecklist, setEditandoChecklist] = useState<string | null>(null);
  const [novoItemTexto, setNovoItemTexto] = useState("");
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const { mostrarErro } = useToast();

  // Cria no estado da demo ou no banco. Devolve true se deu certo.
  const gravarChecklist = async (nome: string, momento: MomentoChecklist): Promise<boolean> => {
    if (emModoDemo) {
      const novo: Checklist = { id: `demo-${Date.now()}`, nome, momento, itens: [], fotos: [], areas: [] };
      setListaChecklists((prev) => [novo, ...prev]);
      return true;
    }
    const resultado = await acaoCriarChecklist({ nome, momento });
    if (!resultado.ok) {
      if (momento === "praca") setErroAcao(resultado.erro);
      else setErroNovo(resultado.erro);
      return false;
    }
    return true;
  };

  const criarChecklist = async () => {
    if (!novoNome.trim()) return;
    setErroNovo(null);
    if (await gravarChecklist(novoNome.trim(), novoMomento)) {
      setNovoNome("");
      setShowNovoChecklist(false);
    }
  };

  const excluirChecklistComConfirmacao = async (ch: Checklist) => {
    if (!window.confirm(`Excluir o checklist "${ch.nome}"? Isso também apaga os itens e o histórico de execuções.`)) return;
    if (emModoDemo) {
      setListaChecklists((prev) => prev.filter((c) => c.id !== ch.id));
      return;
    }
    const resultado = await acaoExcluirChecklist(ch.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  const addItem = async (checklistId: string, ordem: number, textoInformado?: string, areaId: string | null = null): Promise<boolean> => {
    const texto = (textoInformado ?? novoItemTexto).trim();
    if (!texto) return false;
    if (emModoDemo) {
      setListaChecklists((prev) =>
        prev.map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                itens: [
                  ...ch.itens,
                  {
                    id: `demo-item-${Date.now()}`,
                    checklistId,
                    texto,
                    ordem,
                    concluidoHoje: false,
                    areaId,
                  },
                ],
              }
            : ch
        )
      );
      if (textoInformado === undefined) setNovoItemTexto("");
      return true;
    }
    const resultado = await acaoCriarItem(checklistId, texto, ordem, areaId);
    if (!resultado.ok) {
      setErroAcao(resultado.erro);
      return false;
    }
    if (textoInformado === undefined) setNovoItemTexto("");
    return true;
  };

  // Fotos de referência das praças. Na demo a foto fica só nesta sessão
  // (URL local do navegador); no app sobe pro bucket pracas-fotos.
  const adicionarFoto = async (checklistId: string, arquivo: File, legenda: string | null, ordem: number, areaId: string | null) => {
    if (emModoDemo) {
      const url = URL.createObjectURL(arquivo);
      setListaChecklists((prev) =>
        prev.map((ch) => (ch.id === checklistId ? { ...ch, fotos: [...ch.fotos, { id: `demo-foto-${Date.now()}`, checklistId, url, legenda, ordem, areaId }] } : ch)),
      );
      return { ok: true } as const;
    }
    const formData = new FormData();
    formData.set("arquivo", arquivo);
    formData.set("checklistId", checklistId);
    formData.set("legenda", legenda ?? "");
    formData.set("ordem", String(ordem));
    formData.set("areaId", areaId ?? "");
    return acaoAdicionarFotoPraca(formData);
  };

  // POLIMENTO pracas-areas (2026-09-23): nome da praça e áreas (pista fria,
  // bancada, geladeira...), com nome livre. Mesmo padrão: estado local na demo,
  // server action no app.
  const renomearChecklist = async (checklistId: string, nome: string): Promise<boolean> => {
    if (emModoDemo) {
      setListaChecklists((prev) => prev.map((ch) => (ch.id === checklistId ? { ...ch, nome } : ch)));
      return true;
    }
    const r = await acaoRenomearChecklist(checklistId, nome);
    if (!r.ok) setErroAcao(r.erro);
    return r.ok;
  };

  const criarArea = async (checklistId: string, nome: string, ordem: number): Promise<boolean> => {
    if (emModoDemo) {
      setListaChecklists((prev) =>
        prev.map((ch) => (ch.id === checklistId ? { ...ch, areas: [...ch.areas, { id: `demo-area-${Date.now()}`, checklistId, nome, ordem }] } : ch)),
      );
      return true;
    }
    const r = await acaoCriarArea(checklistId, nome, ordem);
    if (!r.ok) setErroAcao(r.erro);
    return r.ok;
  };

  const renomearArea = async (checklistId: string, areaId: string, nome: string): Promise<boolean> => {
    if (emModoDemo) {
      setListaChecklists((prev) =>
        prev.map((ch) => (ch.id === checklistId ? { ...ch, areas: ch.areas.map((a) => (a.id === areaId ? { ...a, nome } : a)) } : ch)),
      );
      return true;
    }
    const r = await acaoRenomearArea(areaId, nome);
    if (!r.ok) setErroAcao(r.erro);
    return r.ok;
  };

  const excluirArea = async (checklistId: string, areaId: string) => {
    if (emModoDemo) {
      setListaChecklists((prev) =>
        prev.map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                areas: ch.areas.filter((a) => a.id !== areaId),
                itens: ch.itens.filter((i) => i.areaId !== areaId),
                fotos: ch.fotos.filter((f) => f.areaId !== areaId),
              }
            : ch,
        ),
      );
      return;
    }
    const r = await acaoRemoverArea(areaId);
    if (!r.ok) setErroAcao(r.erro);
  };

  const removerFoto = async (checklistId: string, fotoId: string) => {
    if (emModoDemo) {
      setListaChecklists((prev) => prev.map((ch) => (ch.id === checklistId ? { ...ch, fotos: ch.fotos.filter((f) => f.id !== fotoId) } : ch)));
      return;
    }
    const resultado = await acaoRemoverFotoPraca(fotoId);
    if (!resultado.ok) setErroAcao(resultado.erro);
  };

  const pracas = listaChecklists.filter((c) => c.momento === "praca");
  const checklistsDoTurno = listaChecklists.filter((c) => c.momento !== "praca");

  const removerItem = async (itemId: string) => {
    if (emModoDemo) {
      setListaChecklists((prev) => prev.map((ch) => ({ ...ch, itens: ch.itens.filter((it) => it.id !== itemId) })));
      return;
    }
    const resultado = await acaoRemoverItem(itemId);
    if (!resultado.ok) setErroAcao(resultado.erro);
  };

  const toggleItem = async (itemId: string, concluidoHoje: boolean) => {
    if (emModoDemo) {
      setListaChecklists((prev) =>
        prev.map((ch) => ({
          ...ch,
          itens: ch.itens.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  concluidoHoje: !concluidoHoje,
                }
              : it
          ),
        }))
      );
      setErroAcao(null);
      return;
    }
    const resultado = await acaoAlternarItem(itemId, concluidoHoje, turnoId, chefeTurno.trim() || null, chefeTurno.trim() || null);
    if (!resultado.ok) setErroAcao(resultado.erro);
  };

  const campo = "text-[14px] px-3 min-h-[var(--alvo-toque)] rounded-lg border bg-[var(--panel)] text-[var(--tinta)]";

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-2xl min-w-0 lg:flex-1">
          {/* POLIMENTO pracas-areas: título e texto acompanham a aba. */}
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">{aba === "pracas" ? "Praças" : "Checklists de turno"}</h2>
          <p className="text-[14px] text-[var(--tinta-sub)] mt-1">
            {aba === "pracas"
              ? "Crie quantas praças a cozinha tiver, com o nome que ela usa. O que for marcado fica registrado no turno e no responsável escolhidos aqui."
              : "Os modelos são ponto de partida: edite, remova e crie o que fizer sentido. O que for marcado fica registrado no turno e no responsável escolhidos aqui."}
          </p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-3 shrink-0">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[var(--tinta-faint)]">Turno</span>
            <select value={turnoId ?? ""} onChange={(e) => setTurnoId(e.target.value || null)} className={campo} style={{ borderColor: "var(--linha-forte)" }}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[var(--tinta-faint)]">Responsável</span>
            <input value={chefeTurno} onChange={(e) => setChefeTurno(e.target.value)} placeholder="Nome" className={`${campo} w-40`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          {aba === "turno" && (
            <button
              onClick={() => setShowNovoChecklist(!showNovoChecklist)}
              className="flex items-center gap-2 text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border"
              style={{
                background: showNovoChecklist ? "var(--panel)" : "var(--accent)",
                color: showNovoChecklist ? "var(--tinta)" : "var(--accent-contrast)",
                borderColor: showNovoChecklist ? "var(--linha-forte)" : "var(--accent)",
              }}
            >
              {!showNovoChecklist && <Plus size={16} />}
              {showNovoChecklist ? "Fechar" : "Novo checklist"}
            </button>
          )}
        </div>
      </div>

      <div className="inline-flex p-0.5 rounded-lg border" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }} role="tablist" aria-label="Visão">
        {[
          { id: "turno" as const, rotulo: `Checklists do turno (${checklistsDoTurno.length})` },
          { id: "pracas" as const, rotulo: `Praças (${pracas.length})` },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={aba === t.id}
            onClick={() => setAba(t.id)}
            className="px-4 min-h-[var(--alvo-toque)] rounded-md text-[14px] font-medium transition-colors"
            style={{
              background: aba === t.id ? "var(--panel)" : "transparent",
              color: aba === t.id ? "var(--tinta)" : "var(--tinta-sub)",
              boxShadow: aba === t.id ? "var(--shadow-sm)" : "none",
            }}
          >
            {t.rotulo}
          </button>
        ))}
      </div>

      {erroAcao && (
        <div role="alert" className="text-[14px] rounded-lg px-4 py-3 flex items-center justify-between gap-3" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {erroAcao}
          <button onClick={() => setErroAcao(null)} className="font-medium min-h-10 px-3 rounded-md">Fechar</button>
        </div>
      )}

      {aba === "pracas" && (
        <PracasView
          pracas={pracas}
          onAlternarItem={toggleItem}
          onAdicionarItem={(checklistId, texto, ordem, areaId) => addItem(checklistId, ordem, texto, areaId)}
          onRemoverItem={removerItem}
          onCriarPraca={(nome) => gravarChecklist(nome, "praca")}
          onExcluirPraca={excluirChecklistComConfirmacao}
          onAdicionarFoto={adicionarFoto}
          onRemoverFoto={removerFoto}
          onRenomearPraca={renomearChecklist}
          onCriarArea={criarArea}
          onRenomearArea={renomearArea}
          onExcluirArea={excluirArea}
        />
      )}

      {aba === "turno" && showNovoChecklist && (
        <Card className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input aria-label="Nome do checklist" placeholder="Nome do checklist" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className={`${campo} sm:col-span-2`} style={{ borderColor: "var(--linha-forte)" }} />
            <select value={novoMomento} onChange={(e) => setNovoMomento(e.target.value as MomentoChecklist)} className={campo} style={{ borderColor: "var(--linha-forte)" }}>
              {MOMENTOS_DE_TURNO.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          {erroNovo && (
            <div className="text-[13px] mb-3 rounded-md px-3 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {erroNovo}
            </div>
          )}
          <button onClick={criarChecklist} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
            Criar checklist
          </button>
        </Card>
      )}

      {aba === "turno" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {checklistsDoTurno.map((ch) => {
            const marcados = ch.itens.filter((i) => i.concluidoHoje).length;
            const total = ch.itens.length;
            const completo = total > 0 && marcados === total;
            const editando = editandoChecklist === ch.id;
            return (
              <Card key={ch.id} className="overflow-hidden">
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-[var(--tinta)]">{ch.nome}</h3>
                      <div className="text-[13px] text-[var(--tinta-faint)] mt-0.5">{MOMENTOS.find((m) => m.id === ch.momento)?.label}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[15px] font-semibold whitespace-nowrap" style={{ ...nums, color: completo ? "var(--sucesso)" : "var(--tinta)" }}>
                        {marcados} de {total}
                      </span>
                      <button
                        onClick={() => setEditandoChecklist(editando ? null : ch.id)}
                        className="text-[13px] font-medium px-3 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
                        style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
                      >
                        {editando ? "Pronto" : "Editar"}
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full mt-3" style={{ background: "var(--panel-elevated)" }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={marcados} aria-label={`${ch.nome}: ${marcados} de ${total}`}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: total ? `${(marcados / total) * 100}%` : "0%", background: completo ? "var(--sucesso)" : "var(--tinta)" }} />
                  </div>
                </div>

                <ul className="border-t divide-y" style={{ borderColor: "var(--linha)" }}>
                  {ch.itens.map((item) => (
                    <li key={item.id} style={{ borderColor: "var(--linha)" }}>
                      {editando ? (
                        <div className="flex items-center gap-3 px-5 min-h-12">
                          <span className="text-[15px] flex-1 text-[var(--tinta-sub)]">{item.texto}</span>
                          <button onClick={() => removerItem(item.id)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--danger-soft)]" style={{ color: "var(--danger)" }} aria-label={`Remover "${item.texto}"`}>
                            <X size={17} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleItem(item.id, item.concluidoHoje)}
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
                  {ch.itens.length === 0 && <li className="px-5 py-4 text-[14px] text-[var(--tinta-faint)]">Sem itens ainda. Toque em Editar pra adicionar.</li>}
                </ul>

                {editando && (
                  <div className="flex flex-wrap gap-2 p-4 border-t" style={{ borderColor: "var(--linha)" }}>
                    <input
                      placeholder="Novo item do checklist"
                      value={novoItemTexto}
                      onChange={(e) => setNovoItemTexto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addItem(ch.id, ch.itens.length);
                      }}
                      className={`${campo} flex-1 min-w-48`}
                      style={{ borderColor: "var(--linha-forte)" }}
                    />
                    <button onClick={() => addItem(ch.id, ch.itens.length)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                      Adicionar
                    </button>
                    <button onClick={() => excluirChecklistComConfirmacao(ch)} className="text-[14px] font-medium px-4 min-h-[var(--alvo-toque)] rounded-lg border" style={{ color: "var(--danger)", borderColor: "var(--linha-forte)" }}>
                      Excluir checklist
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
          {checklistsDoTurno.length === 0 && !showNovoChecklist && (
            <div className="lg:col-span-2 text-[14px] py-8 text-center text-[var(--tinta-faint)]">Nenhum checklist cadastrado ainda.</div>
          )}
        </div>
      )}
    </div>
  );
}
