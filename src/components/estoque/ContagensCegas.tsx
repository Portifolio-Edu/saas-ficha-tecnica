"use client";

// EQUIPE (2026-09-25): resultado da contagem cega, só pra dono e gestor. A
// cozinha contou sem ver o saldo; aqui aparece a diferença pro sistema, em
// quantidade e em R$. Falta grande e repetida no mesmo item é o sinal de
// desvio. Na demo (/preview) as ações gravam no "banco" da demo
// (src/lib/demo/contagens.ts): o ajuste aparece no saldo e nas movimentações.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { nums } from "@/components/ficha/tema";
import { useToast } from "@/components/ficha/Toast";
import { formatBRL, formatQtd } from "@/components/charts/format";
import type { ContagemCega } from "@/lib/dominio/estoque";
import { acaoAplicarContagem, acaoDescartarContagem } from "@/app/estoque/actions";
import { aplicarContagemDemo, descartarContagemDemo } from "@/lib/demo/contagens";

const valorDaDiferenca = (c: ContagemCega) =>
  c.itens.reduce((soma, i) => soma + (i.contada - i.sistema) * i.precoUnitario, 0);

export function ContagensCegas({ contagens: iniciais }: { contagens: ContagemCega[] }) {
  const emModoDemo = usePathname()?.startsWith("/preview");
  const { mostrarErro, mostrarSucesso } = useToast();
  // Na demo a lista é local; no app vem das props, que a server action e a
  // atualização automática da página renovam (useState das props congelaria).
  const [contagensDemo, setContagens] = useState(iniciais);
  const contagens = emModoDemo ? contagensDemo : iniciais;
  const [aberta, setAberta] = useState<string | null>(iniciais.find((c) => !c.aplicadaEm)?.id ?? null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  if (contagens.length === 0) return null;

  const aplicar = async (c: ContagemCega) => {
    if (!window.confirm("Ajustar o estoque pelo que foi contado? Cada diferença vira uma movimentação.")) return;
    setOcupado(c.id);
    const r = emModoDemo ? (aplicarContagemDemo(c, contagens), { ok: true as const }) : await acaoAplicarContagem(c.id);
    setOcupado(null);
    if (!r.ok) return mostrarErro(r.erro);
    setContagens((atual) => atual.map((x) => (x.id === c.id ? { ...x, aplicadaEm: new Date().toISOString() } : x)));
    mostrarSucesso("Estoque ajustado pela contagem.");
  };

  const descartar = async (c: ContagemCega) => {
    if (!window.confirm("Descartar esta contagem? O estoque não muda.")) return;
    setOcupado(c.id);
    const r = emModoDemo ? (descartarContagemDemo(c.id, contagens), { ok: true as const }) : await acaoDescartarContagem(c.id);
    setOcupado(null);
    if (!r.ok) return mostrarErro(r.erro);
    setContagens((atual) => atual.filter((x) => x.id !== c.id));
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b flex items-start gap-3" style={{ borderColor: "var(--linha)" }}>
        <EyeOff size={17} className="mt-0.5 text-[var(--tinta-faint)] shrink-0" />
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Contagens cegas</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
            A cozinha contou sem ver o saldo. Só você e o gestor veem a diferença. Falta que se repete no mesmo item merece conversa.
          </p>
        </div>
      </div>
      <ul>
        {contagens.map((c) => {
          const valor = valorDaDiferenca(c);
          const expandida = aberta === c.id;
          const comDiferenca = c.itens.filter((i) => Math.abs(i.contada - i.sistema) > 0.0005);
          return (
            <li key={c.id} className="border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
              <button
                onClick={() => setAberta(expandida ? null : c.id)}
                className="w-full px-4 md:px-5 py-3 flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-1 text-left hover:bg-[var(--panel-hover)]"
                aria-expanded={expandida}
              >
                {expandida ? <ChevronDown size={16} className="text-[var(--tinta-faint)]" /> : <ChevronRight size={16} className="text-[var(--tinta-faint)]" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-[var(--tinta)]">
                    {new Date(c.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {c.responsavel}
                  </div>
                  <div className="text-[12px] text-[var(--tinta-faint)]">
                    {c.itens.length} itens contados · {comDiferenca.length} com diferença
                  </div>
                </div>
                <span className="text-[14px] font-semibold" style={{ ...nums, color: valor < -0.5 ? "var(--danger)" : "var(--tinta)" }}>
                  {valor < 0 ? "−" : valor > 0 ? "+" : ""}
                  {formatBRL(Math.abs(valor))}
                </span>
                {c.aplicadaEm ? <Badge variante="sucesso">Aplicada</Badge> : <Badge variante="aviso">A revisar</Badge>}
              </button>

              {expandida && (
                <div className="px-4 md:px-5 pb-4">
                  {/* CELULAR (2026-09-26): no celular, lista (item, contado × sistema, diferença). */}
                  <ul aria-label="Itens da contagem" className="md:hidden">
                    {c.itens.map((i) => {
                      const dif = i.contada - i.sistema;
                      const falta = dif < -0.0005;
                      return (
                        <li key={i.insumoId} className="py-2.5 border-t first:border-t-0 flex items-start justify-between gap-3" style={{ borderColor: "var(--linha)" }}>
                          <div className="min-w-0">
                            <div className="text-[15px] text-[var(--tinta)]">{i.nome}</div>
                            <div className="text-[13px] text-[var(--tinta-sub)]" style={nums}>
                              contou {formatQtd(i.contada)}{i.unidadeMedida} · sistema {formatQtd(i.sistema)}{i.unidadeMedida}
                            </div>
                          </div>
                          <div className="text-right shrink-0" style={nums}>
                            <div className="text-[15px] font-semibold" style={{ color: falta ? "var(--danger)" : "var(--tinta)" }}>
                              {dif > 0 ? "+" : ""}{formatQtd(dif)}{i.unidadeMedida}
                            </div>
                            {Math.abs(dif) > 0.0005 && (
                              <div className="text-[12.5px]" style={{ color: falta ? "var(--danger)" : "var(--tinta-faint)" }}>
                                {falta ? "−" : ""}{formatBRL(Math.abs(dif * i.precoUnitario))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div tabIndex={0} role="region" aria-label="Itens da contagem" className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-[var(--tinta-faint)]">
                          <th className="py-2 pr-3 font-medium">Item</th>
                          <th className="py-2 px-3 font-medium text-right">Contado</th>
                          <th className="py-2 px-3 font-medium text-right">No sistema</th>
                          <th className="py-2 px-3 font-medium text-right">Diferença</th>
                          <th className="py-2 pl-3 font-medium text-right">Em R$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.itens.map((i) => {
                          const dif = i.contada - i.sistema;
                          const falta = dif < -0.0005;
                          return (
                            <tr key={i.insumoId} className="border-t" style={{ borderColor: "var(--linha)" }}>
                              <td className="py-2 pr-3 text-[var(--tinta)]">{i.nome}</td>
                              <td className="py-2 px-3 text-right" style={nums}>{formatQtd(i.contada)}{i.unidadeMedida}</td>
                              <td className="py-2 px-3 text-right text-[var(--tinta-sub)]" style={nums}>{formatQtd(i.sistema)}{i.unidadeMedida}</td>
                              <td className="py-2 px-3 text-right font-medium" style={{ ...nums, color: falta ? "var(--danger)" : "var(--tinta)" }}>
                                {dif > 0 ? "+" : ""}{formatQtd(dif)}{i.unidadeMedida}
                              </td>
                              <td className="py-2 pl-3 text-right" style={{ ...nums, color: falta ? "var(--danger)" : "var(--tinta-sub)" }}>
                                {dif < -0.0005 ? "−" : ""}{formatBRL(Math.abs(dif * i.precoUnitario))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!c.aplicadaEm && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => aplicar(c)}
                        disabled={ocupado === c.id}
                        className="text-[13px] font-medium px-3.5 min-h-11 md:min-h-9 rounded-lg disabled:opacity-60"
                        style={{ background: "var(--tinta)", color: "var(--panel)" }}
                      >
                        Ajustar estoque pela contagem
                      </button>
                      <button
                        onClick={() => descartar(c)}
                        disabled={ocupado === c.id}
                        className="text-[13px] font-medium px-3 min-h-11 md:min-h-9 rounded-lg border hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        style={{ borderColor: "var(--linha-forte)" }}
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
