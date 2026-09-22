"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { inputStyle, nums } from "@/components/ficha/tema";
import { useToast } from "@/components/ficha/Toast";
import type { Checklist, MomentoChecklist } from "@/lib/dominio/checklist";
import { MOMENTOS } from "@/lib/dominio/checklist";
import type { Turno } from "@/lib/dominio/producao";
import { acaoCriarChecklist, acaoExcluirChecklist, acaoCriarItem, acaoRemoverItem, acaoAlternarItem } from "./actions";

export function ChecklistsClient({ checklists, turnos }: { checklists: Checklist[]; turnos: Turno[] }) {
  const [turnoId, setTurnoId] = useState<string | null>(turnos[0]?.id ?? null);
  const [chefeTurno, setChefeTurno] = useState("");
  const [showNovoChecklist, setShowNovoChecklist] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoMomento, setNovoMomento] = useState<MomentoChecklist>("abertura");
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [editandoChecklist, setEditandoChecklist] = useState<string | null>(null);
  const [novoItemTexto, setNovoItemTexto] = useState("");
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const { mostrarErro } = useToast();

  const criarChecklist = async () => {
    if (!novoNome.trim()) return;
    setErroNovo(null);
    const resultado = await acaoCriarChecklist({ nome: novoNome.trim(), momento: novoMomento });
    if (!resultado.ok) {
      setErroNovo(resultado.erro);
      return;
    }
    setNovoNome("");
    setShowNovoChecklist(false);
  };

  const excluirChecklistComConfirmacao = async (ch: Checklist) => {
    if (!window.confirm(`Excluir o checklist "${ch.nome}"? Isso também apaga os itens e o histórico de execuções.`)) return;
    const resultado = await acaoExcluirChecklist(ch.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  const addItem = async (checklistId: string, ordem: number) => {
    if (!novoItemTexto.trim()) return;
    const resultado = await acaoCriarItem(checklistId, novoItemTexto.trim(), ordem);
    if (!resultado.ok) {
      setErroAcao(resultado.erro);
      return;
    }
    setNovoItemTexto("");
  };

  const toggleItem = async (itemId: string, concluidoHoje: boolean) => {
    const resultado = await acaoAlternarItem(itemId, concluidoHoje, turnoId, chefeTurno.trim() || null, chefeTurno.trim() || null);
    if (!resultado.ok) setErroAcao(resultado.erro);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[14px] font-semibold">Checklists de turno</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Turno</span>
            <select value={turnoId ?? ""} onChange={(e) => setTurnoId(e.target.value || null)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.horario ? ` (${t.horario})` : ""}</option>
              ))}
            </select>
            <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>responsável</span>
            <input value={chefeTurno} onChange={(e) => setChefeTurno(e.target.value)} placeholder="nome" className="text-[12px] px-2 py-1 rounded-md w-28" style={inputStyle} />
          </div>
          <button
            onClick={() => setShowNovoChecklist(!showNovoChecklist)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoChecklist ? "var(--bg)" : "var(--accent)", color: showNovoChecklist ? "var(--text)" : "#fff", border: `1px solid ${showNovoChecklist ? "var(--border-strong)" : "var(--accent)"}` }}
          >
            {showNovoChecklist ? "Fechar" : "+ Novo checklist"}
          </button>
        </div>
      </div>
      <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>
        Cada casa monta o seu. Os modelos abaixo são ponto de partida: o chef edita, remove e cria o que fizer sentido pra operação dele. O que for marcado fica registrado no turno e responsável selecionados acima.
      </p>

      {erroAcao && (
        <div className="text-[12.5px] mb-3 rounded-lg px-3.5 py-2 flex items-center justify-between" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {erroAcao}
          <button onClick={() => setErroAcao(null)} className="font-medium ml-3">fechar</button>
        </div>
      )}

      {showNovoChecklist && (
        <Card className="mb-4">
          <div className="px-5 py-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input placeholder="Nome do checklist" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
              <select value={novoMomento} onChange={(e) => setNovoMomento(e.target.value as MomentoChecklist)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle}>
                {MOMENTOS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            {erroNovo && (
              <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {erroNovo}
              </div>
            )}
            <button onClick={criarChecklist} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)" }}>
              Criar checklist
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {checklists.map((ch) => {
          const marcados = ch.itens.filter((i) => i.concluidoHoje).length;
          const total = ch.itens.length;
          const completo = total > 0 && marcados === total;
          const editando = editandoChecklist === ch.id;
          return (
            <Card key={ch.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[13px] font-semibold">{ch.nome}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "var(--faint)" }}>{MOMENTOS.find((m) => m.id === ch.momento)?.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold" style={{ ...nums, color: completo ? "var(--accent)" : "var(--sub)" }}>{marcados}/{total}</span>
                  <button onClick={() => setEditandoChecklist(editando ? null : ch.id)} className="text-[11px] px-2 py-1 rounded-md" style={{ border: `1px solid ${"var(--border-strong)"}`, color: "var(--sub)" }}>
                    {editando ? "Pronto" : "Editar"}
                  </button>
                </div>
              </div>

              <div className="h-1 rounded-full mb-3" style={{ background: "var(--border)" }}>
                <div className="h-1 rounded-full" style={{ width: total ? `${(marcados / total) * 100}%` : "0%", background: completo ? "var(--accent)" : "var(--sub)" }} />
              </div>

              <div className="space-y-1">
                {ch.itens.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-1">
                    {editando ? (
                      <>
                        <span className="text-[12px] flex-1" style={{ color: "var(--sub)" }}>{item.texto}</span>
                        <button onClick={() => acaoRemoverItem(item.id).then((r) => !r.ok && setErroAcao(r.erro))} style={{ color: "var(--danger)" }}>
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => toggleItem(item.id, item.concluidoHoje)} className="flex items-center gap-2 text-left w-full">
                        <span className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center" style={{ border: `1.5px solid ${item.concluidoHoje ? "var(--accent)" : "var(--border-strong)"}`, background: item.concluidoHoje ? "var(--accent)" : "transparent" }}>
                          {item.concluidoHoje && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                        </span>
                        <span className="text-[12px]" style={{ color: item.concluidoHoje ? "var(--faint)" : "var(--text)", textDecoration: item.concluidoHoje ? "line-through" : "none" }}>{item.texto}</span>
                      </button>
                    )}
                  </div>
                ))}
                {ch.itens.length === 0 && <div className="text-[11.5px] py-1" style={{ color: "var(--faint)" }}>Sem itens ainda.</div>}
              </div>

              {editando && (
                <div className="flex gap-2 mt-3">
                  <input
                    placeholder="Novo item do checklist"
                    value={novoItemTexto}
                    onChange={(e) => setNovoItemTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addItem(ch.id, ch.itens.length);
                    }}
                    className="text-[12px] px-2.5 py-1.5 rounded-md flex-1"
                    style={inputStyle}
                  />
                  <button onClick={() => addItem(ch.id, ch.itens.length)} className="text-[12px] font-medium px-3 py-1.5 rounded-md" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)" }}>
                    +
                  </button>
                  <button onClick={() => excluirChecklistComConfirmacao(ch)} className="text-[12px] font-medium px-3 py-1.5 rounded-md" style={{ color: "var(--danger)", border: `1px solid ${"var(--border-strong)"}` }}>
                    Excluir checklist
                  </button>
                </div>
              )}
            </Card>
          );
        })}
        {checklists.length === 0 && !showNovoChecklist && (
          <div className="col-span-2 text-[12.5px] py-6 text-center" style={{ color: "var(--faint)" }}>
            Nenhum checklist cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
