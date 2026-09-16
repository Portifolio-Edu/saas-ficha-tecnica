"use client";

import { useState } from "react";
import { Card } from "@/components/ficha/Card";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import type { LocalArmazenamento, LocalArmazenamentoInput, RegistroTemperatura, RegistroTemperaturaInput } from "@/lib/dominio/temperatura";
import { acaoCriarLocal, acaoAtualizarLocal, acaoExcluirLocal, acaoRegistrarTemperatura } from "./actions";

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function NovoLocalForm({ local, onCancel, onSaved }: { local?: LocalArmazenamento; onCancel: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(local?.nome ?? "");
  const [min, setMin] = useState(local?.temperaturaMinC != null ? String(local.temperaturaMinC) : "");
  const [max, setMax] = useState(local?.temperaturaMaxC != null ? String(local.temperaturaMaxC) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    const input: LocalArmazenamentoInput = {
      nome: nome.trim(),
      temperaturaMinC: min ? parseFloat(min) : null,
      temperaturaMaxC: max ? parseFloat(max) : null,
    };
    const resultado = local ? await acaoAtualizarLocal(local.id, input) : await acaoCriarLocal(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <input placeholder="Nome do local (ex: Freezer 1)" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle} />
        <input placeholder="Temp. mínima (°C)" type="number" value={min} onChange={(e) => setMin(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Temp. máxima (°C)" type="number" value={max} onChange={(e) => setMax(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : local ? "Salvar alterações" : "Salvar local"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function NovaTemperaturaForm({ locais, onCancel, onSaved }: { locais: LocalArmazenamento[]; onCancel: () => void; onSaved: () => void }) {
  const [localId, setLocalId] = useState(locais[0]?.id ?? "");
  const [temperatura, setTemperatura] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const local = locais.find((l) => l.id === localId);
  const valor = parseFloat(temperatura);
  const foraDaFaixa = local && temperatura !== "" && ((local.temperaturaMinC != null && valor < local.temperaturaMinC) || (local.temperaturaMaxC != null && valor > local.temperaturaMaxC));

  const salvar = async () => {
    if (!localId || temperatura === "" || !responsavel.trim()) return;
    setSalvando(true);
    setErro(null);
    const input: RegistroTemperaturaInput = { localArmazenamentoId: localId, temperaturaC: valor, responsavel: responsavel.trim() };
    const resultado = await acaoRegistrarTemperatura(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved();
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-2">
        <select value={localId} onChange={(e) => setLocalId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        <input placeholder="Temperatura (°C)" type="number" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      {foraDaFaixa && (
        <div className="text-[12px] mb-2" style={{ color: C.danger }}>
          Fora da faixa ideal desse local ({local?.temperaturaMinC}°C a {local?.temperaturaMaxC}°C), mas dá pra salvar mesmo assim, o registro é o que importa.
        </div>
      )}
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar leitura"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function SegurancaClient({ locais, registros }: { locais: LocalArmazenamento[]; registros: RegistroTemperatura[] }) {
  const [showNovoLocal, setShowNovoLocal] = useState(false);
  const [localEditando, setLocalEditando] = useState<LocalArmazenamento | null>(null);
  const [showNovaTemperatura, setShowNovaTemperatura] = useState(false);

  const excluirLocalComConfirmacao = async (local: LocalArmazenamento) => {
    if (!window.confirm(`Excluir "${local.nome}"? Isso também apaga o histórico de leituras desse local.`)) return;
    const resultado = await acaoExcluirLocal(local.id);
    if (!resultado.ok) window.alert(resultado.erro);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Locais de armazenamento</h2>
          <button
            onClick={() => {
              setLocalEditando(null);
              setShowNovoLocal(!showNovoLocal);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoLocal ? C.bg : C.text, color: showNovoLocal ? C.text : "#fff", border: `1px solid ${showNovoLocal ? C.borderStrong : C.text}` }}
          >
            {showNovoLocal ? "Fechar" : "+ Novo local"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Faixa ideal de cada local (freezer, câmara fria, estoque seco) -- é contra ela que toda leitura é avaliada.</p>

        {showNovoLocal && (
          <Card className="mb-3">
            <NovoLocalForm onCancel={() => setShowNovoLocal(false)} onSaved={() => setShowNovoLocal(false)} />
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          {locais.map((local) => {
            const ultima = registros.find((r) => r.localArmazenamentoId === local.id);
            const foraDaFaixa = !!ultima && ((local.temperaturaMinC != null && ultima.temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && ultima.temperaturaC > local.temperaturaMaxC));
            const editandoEsteAqui = localEditando?.id === local.id;
            return (
              <Card key={local.id} className="p-5">
                {editandoEsteAqui ? (
                  <NovoLocalForm local={local} onCancel={() => setLocalEditando(null)} onSaved={() => setLocalEditando(null)} />
                ) : (
                  <>
                    <div className="text-[13px]" style={{ color: C.sub }}>{local.nome}</div>
                    <div className="text-[30px] font-bold mt-1.5 leading-none" style={{ ...nums, color: foraDaFaixa ? C.danger : C.text, letterSpacing: "-0.02em" }}>
                      {ultima ? `${ultima.temperaturaC}°C` : "—"}
                    </div>
                    <div className="text-[12px] mt-2" style={{ color: C.faint }}>
                      faixa ideal: {local.temperaturaMinC ?? "—"}°C a {local.temperaturaMaxC ?? "—"}°C
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => {
                          setShowNovoLocal(false);
                          setLocalEditando(local);
                        }}
                        className="text-[11.5px] font-medium"
                        style={{ color: C.text }}
                      >
                        editar
                      </button>
                      <button onClick={() => excluirLocalComConfirmacao(local)} className="text-[11.5px] font-medium" style={{ color: C.danger }}>
                        excluir
                      </button>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
          {locais.length === 0 && (
            <div className="col-span-3 text-[12.5px] py-6 text-center" style={{ color: C.faint }}>
              Nenhum local de armazenamento cadastrado ainda.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Temperatura de armazenamento</h2>
          <button
            onClick={() => setShowNovaTemperatura(!showNovaTemperatura)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovaTemperatura ? C.bg : C.text, color: showNovaTemperatura ? C.text : "#fff", border: `1px solid ${showNovaTemperatura ? C.borderStrong : C.text}` }}
            disabled={locais.length === 0}
            title={locais.length === 0 ? "Cadastre um local primeiro" : undefined}
          >
            {showNovaTemperatura ? "Fechar" : "+ Registrar leitura"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: C.sub }}>Leitura manual por local de armazenamento, com responsável. Fica fora da faixa quando passa do limite cadastrado pro local.</p>

        {showNovaTemperatura && (
          <Card className="mb-4">
            <NovaTemperaturaForm locais={locais} onCancel={() => setShowNovaTemperatura(false)} onSaved={() => setShowNovaTemperatura(false)} />
          </Card>
        )}

        <Card>
          <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <h2 className="text-[13px] font-semibold">Histórico de leituras</h2>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: C.faint }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Data</th>
                <th className="py-2.5 px-3 font-medium">Local</th>
                <th className="py-2.5 px-3 font-medium">Responsável</th>
                <th className="py-2.5 px-5 font-medium text-right">Temperatura</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const local = locais.find((l) => l.id === r.localArmazenamentoId);
                const foraDaFaixa = !!local && ((local.temperaturaMinC != null && r.temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && r.temperaturaC > local.temperaturaMaxC));
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="py-2.5 px-5">{formatarDataHora(r.registradoEm)}</td>
                    <td className="py-2.5 px-3">{r.nomeLocal}</td>
                    <td className="py-2.5 px-3" style={{ color: C.sub }}>{r.responsavel}</td>
                    <td className="py-2.5 px-5 text-right font-medium" style={{ ...nums, color: foraDaFaixa ? C.danger : C.text }}>
                      {r.temperaturaC}°C{foraDaFaixa && " · fora da faixa"}
                    </td>
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-5 text-center" style={{ color: C.faint }}>
                    Nenhuma leitura registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
