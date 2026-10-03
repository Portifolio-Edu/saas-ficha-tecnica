"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Turno } from "@/lib/dominio/producao";
import { BotaoPrimario, BotaoSecundario, Campo, CampoTexto, MensagemErro, SecaoConfig } from "./campos";
import type { AcoesConfiguracoes } from "./tipos";

// CONFIGURAÇÕES (2026-10-03): turnos do restaurante. Antes só existiam os três
// padrões (Manhã, Tarde, Noite), criados sozinhos na primeira visita a
// Produções, e não dava pra mudar. Os turnos daqui alimentam o seletor de
// Produções e de Checklists. Turno que já tem registro não pode ser excluído
// (o histórico aponta pra ele): renomeie.

interface Rascunho {
  id: string | null;
  nome: string;
  horario: string;
}

export function TurnosConfig({ turnos, acoes }: { turnos: Turno[]; acoes: AcoesConfiguracoes }) {
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rascunho) return;
    setSalvando(true);
    setErro(null);
    try {
      const r = await acoes.salvarTurno(rascunho.id, { nome: rascunho.nome, horario: rascunho.horario });
      if (!r.ok) setErro(r.erro);
      else setRascunho(null);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (t: Turno) => {
    if (!window.confirm(`Excluir o turno "${t.nome}"?`)) return;
    setErroLista(null);
    const r = await acoes.excluirTurno(t.id);
    if (!r.ok) setErroLista(r.erro);
  };

  return (
    <SecaoConfig
      titulo="Turnos"
      descricao="Aparecem como opção ao registrar produção e ao marcar checklists. O horário é só uma referência pra equipe."
      acao={
        !rascunho && (
          <BotaoSecundario
            onClick={() => {
              setErro(null);
              setRascunho({ id: null, nome: "", horario: "" });
            }}
          >
            <Plus size={15} /> Novo turno
          </BotaoSecundario>
        )
      }
    >
      <ul className="divide-y" style={{ borderColor: "var(--linha)" }} aria-label="Turnos">
        {turnos.map((t) => (
          <li key={t.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-48">
              <div className="text-[15px] font-medium text-[var(--tinta)]">{t.nome}</div>
              <div className="text-[13px] text-[var(--tinta-sub)] mt-0.5">{t.horario || "Sem horário informado"}</div>
            </div>
            <div className="flex items-center gap-2">
              <BotaoSecundario onClick={() => { setErro(null); setRascunho({ id: t.id, nome: t.nome, horario: t.horario ?? "" }); }} ariaLabel={`Editar ${t.nome}`}>
                <Pencil size={14} /> Editar
              </BotaoSecundario>
              <BotaoSecundario onClick={() => excluir(t)} destrutivo ariaLabel={`Excluir ${t.nome}`} disabled={turnos.length <= 1}>
                <Trash2 size={14} />
              </BotaoSecundario>
            </div>
          </li>
        ))}
      </ul>

      {erroLista && (
        <div className="px-5 pb-4">
          <MensagemErro erro={erroLista} />
        </div>
      )}

      {rascunho && (
        <form onSubmit={salvar} className="px-5 py-5 border-t space-y-4" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
          <h3 className="text-[14px] font-semibold text-[var(--tinta)]">{rascunho.id ? "Editar turno" : "Novo turno"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <Campo rotulo="Nome do turno" htmlFor="cfg-turno-nome">
              <CampoTexto id="cfg-turno-nome" value={rascunho.nome} onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })} placeholder="Almoço" autoFocus />
            </Campo>
            <Campo rotulo="Horário (opcional)" htmlFor="cfg-turno-horario">
              <CampoTexto id="cfg-turno-horario" value={rascunho.horario} onChange={(e) => setRascunho({ ...rascunho, horario: e.target.value })} placeholder="11h às 15h" />
            </Campo>
          </div>
          <MensagemErro erro={erro} />
          <div className="flex flex-wrap items-center gap-2">
            <BotaoPrimario type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : rascunho.id ? "Salvar turno" : "Adicionar turno"}
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setRascunho(null)} disabled={salvando}>
              Cancelar
            </BotaoSecundario>
          </div>
        </form>
      )}
    </SecaoConfig>
  );
}
