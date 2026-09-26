"use client";

// CELULAR (2026-09-26): link só de consulta de cada pessoa da cozinha, na
// tela Equipe. O gestor gera, manda no WhatsApp (mensagem pronta) e desliga
// quando a pessoa sai ou perde o celular. O link aparece só na hora em que é
// gerado (o banco guarda o hash): perdeu, gera outro e o anterior para.
// A pessoa vê no celular: /consulta/[código] (ConsultaFuncionarioView).

import { useState } from "react";
import { Copy, Link2, MessageCircle, Smartphone } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { useToast } from "@/components/ficha/Toast";
import { linkWhatsAppConvite, type LinkConsulta } from "@/lib/dominio/consulta";
import type { Funcionario } from "@/lib/dominio/equipe";

type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

export interface AcoesLinks {
  gerarLink: (funcionarioId: string) => Promise<Resultado<{ link: string; criadoEm: string }>>;
  desligarLink: (funcionarioId: string) => Promise<Resultado>;
}

const botao = "text-[13px] font-medium px-3 min-h-11 md:min-h-9 rounded-lg border inline-flex items-center justify-center gap-1.5 hover:bg-[var(--panel-hover)] disabled:opacity-60";

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 86_400_000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return `hoje às ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function LinksConsulta({
  funcionarios,
  links: linksIniciais,
  nomeRestaurante,
  acoes,
}: {
  funcionarios: Funcionario[];
  links: LinkConsulta[];
  nomeRestaurante: string;
  acoes: AcoesLinks;
}) {
  const { mostrarErro, mostrarSucesso } = useToast();
  const [links, setLinks] = useState(linksIniciais);
  const [novo, setNovo] = useState<{ funcionarioId: string; link: string } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const porPessoa = new Map(links.map((l) => [l.funcionarioId, l]));

  const gerar = async (f: Funcionario) => {
    if (porPessoa.has(f.id) && !window.confirm(`Gerar um link novo pra ${f.nome}? O link que ela tem hoje para de abrir.`)) return;
    setOcupado(f.id);
    const r = await acoes.gerarLink(f.id);
    setOcupado(null);
    if (!r.ok || !r.dados) return mostrarErro(r.ok ? "Não foi possível gerar o link." : r.erro);
    const { link, criadoEm } = r.dados;
    setLinks((atual) => [...atual.filter((l) => l.funcionarioId !== f.id), { funcionarioId: f.id, criadoEm, ultimoAcessoEm: null }]);
    setNovo({ funcionarioId: f.id, link });
  };

  const desligar = async (f: Funcionario) => {
    if (!window.confirm(`Desligar o link de ${f.nome}? Ele para de abrir na hora.`)) return;
    setOcupado(f.id);
    const r = await acoes.desligarLink(f.id);
    setOcupado(null);
    if (!r.ok) return mostrarErro(r.erro);
    setLinks((atual) => atual.filter((l) => l.funcionarioId !== f.id));
    if (novo?.funcionarioId === f.id) setNovo(null);
    mostrarSucesso(`Link de ${f.nome} desligado.`);
  };

  const copiar = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      mostrarSucesso("Link copiado.");
    } catch {
      mostrarErro("Não deu pra copiar. Segure o dedo no link pra copiar.");
    }
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 md:px-5 py-4 flex items-start gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
        <Smartphone size={18} className="text-[var(--tinta-faint)] mt-0.5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Link de consulta no celular</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5 max-w-xl">
            Cada pessoa recebe um link pra ver no próprio celular a escala dela, as fichas (sem custo) e os checklists do dia — antes de chegar
            ou fora do restaurante. Só consulta: não registra nada. Desligue quando a pessoa sair.
          </p>
        </div>
      </div>

      <ul>
        {funcionarios.length === 0 && <li className="px-4 md:px-5 py-4 text-[13px] text-[var(--tinta-faint)]">Cadastre os nomes em &quot;Quem trabalha na cozinha&quot; pra gerar os links.</li>}
        {funcionarios.map((f) => {
          const l = porPessoa.get(f.id);
          const recemGerado = novo?.funcionarioId === f.id ? novo.link : null;
          const temporario = f.id.startsWith("novo-");
          return (
            <li key={f.id} className="px-4 md:px-5 py-3 border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex-1 min-w-[10rem]">
                  <div className="text-[15px] md:text-[14px] font-medium text-[var(--tinta)]">{f.nome}</div>
                  <div className="text-[12.5px] text-[var(--tinta-sub)]">
                    {!l ? "Sem link" : `Link desde ${quando(l.criadoEm)} · ${l.ultimoAcessoEm ? `abriu ${quando(l.ultimoAcessoEm)}` : "ainda não abriu"}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => gerar(f)} disabled={ocupado !== null || temporario} className={botao} style={{ borderColor: "var(--linha-forte)" }}>
                    <Link2 size={14} aria-hidden /> {ocupado === f.id ? "Gerando…" : l ? "Gerar novo" : "Gerar link"}
                  </button>
                  {l && (
                    <button onClick={() => desligar(f)} disabled={ocupado !== null} className={botao} style={{ borderColor: "var(--linha-forte)", color: "var(--danger)" }} aria-label={`Desligar o link de ${f.nome}`}>
                      Desligar
                    </button>
                  )}
                </div>
              </div>

              {recemGerado && (
                <div className="mt-3 rounded-lg border p-3 space-y-2.5" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
                  <p className="text-[13px] text-[var(--tinta)]">
                    Link de {f.nome.split(" ")[0]} pronto. Mande agora: <strong className="font-semibold">ele só aparece esta vez</strong> (se perder, gere outro).
                  </p>
                  <input
                    readOnly
                    value={recemGerado}
                    aria-label={`Link de ${f.nome}`}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full text-[13px] px-3 min-h-11 rounded-lg border bg-[var(--panel)] text-[var(--tinta)]"
                    style={{ borderColor: "var(--linha-forte)" }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={linkWhatsAppConvite(f.nome, nomeRestaurante, recemGerado)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-medium px-3.5 min-h-11 md:min-h-9 rounded-lg inline-flex items-center gap-1.5"
                      style={{ background: "var(--tinta)", color: "var(--panel)" }}
                    >
                      <MessageCircle size={15} aria-hidden /> Mandar no WhatsApp
                    </a>
                    <button onClick={() => copiar(recemGerado)} className={botao} style={{ borderColor: "var(--linha-forte)" }}>
                      <Copy size={14} aria-hidden /> Copiar link
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
