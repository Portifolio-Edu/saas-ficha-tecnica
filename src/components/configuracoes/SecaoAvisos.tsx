"use client";

// AVISOS NO WHATSAPP (2026-10-02): o que o sistema avisa sozinho pelo
// WhatsApp (via n8n) e pra quem. Só gestão. As regras ficam em
// src/lib/automacoes; aqui só liga, desliga e escolhe horário.
// AVISOS PRA GESTÃO (2026-10-02): opções por assunto do gestor (problemas
// pra resolver e relatórios). Temperatura saiu: é cobrança da nutricionista.

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Beef, ChartColumn, CheckCircle2, ClipboardList, Clock, Package, ShoppingCart, Sun, Trash2, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Bloco, Campo, Interruptor, RodapeSalvar, useAvisoDaAcao } from "./campos";
import { useConfiguracoes } from "./contexto";
import { formatarTelefone } from "@/lib/telefone";
import { ROTULO_PAPEL } from "@/lib/auth/papeis";
import type { ConfigAvisos, TipoAviso } from "@/lib/automacoes/avisos";
import type { AvisoEnviado } from "@/lib/dados/avisos";
import type { EstadoForm } from "@/app/configuracoes/actions";
import { dataBR } from "@/lib/formato";

const ROTULO_TIPO: Record<TipoAviso, { rotulo: string; icone: LucideIcon }> = {
  estoque_baixo: { rotulo: "Insumo abaixo do mínimo", icone: Package },
  compras_prazo: { rotulo: "Pedido do fornecedor fechando", icone: ShoppingCart },
  preco_subiu: { rotulo: "Fornecedor subiu o preço", icone: TrendingUp },
  rendimento_baixo: { rotulo: "Carne rendendo menos", icone: Beef },
  equipe: { rotulo: "Falta gente na equipe", icone: Users },
  desperdicio: { rotulo: "Produção perdida", icone: Trash2 },
  vendas: { rotulo: "Fechamento de vendas", icone: ChartColumn },
  checklist_abertura: { rotulo: "Abertura atrasada", icone: ClipboardList },
  resumo_diario: { rotulo: "Resumo de ontem", icone: Sun },
};

type Liga = "estoqueBaixo" | "fornecedor" | "equipe" | "desperdicio" | "vendas" | "checklistAbertura" | "resumoDiario";
type Hora = "equipeHora" | "checklistAberturaAte" | "resumoHora";

interface Opcao {
  nome: Liga;
  rotulo: string;
  descricao: string;
  hora?: { nome: Hora; rotulo: string };
}

/** Problemas: chegam na hora em que acontecem (fora do silêncio), juntos num aviso só. */
const PROBLEMAS: Opcao[] = [
  { nome: "estoqueBaixo", rotulo: "Falta de insumo", descricao: "Quando um insumo fica abaixo do mínimo, com o prazo do fornecedor pra repor." },
  {
    nome: "fornecedor",
    rotulo: "Problema com fornecedor",
    descricao: "Pedido do fornecedor fechando com pedido da cozinha esperando, preço que subiu 10% ou mais e carne rendendo menos que a ficha.",
  },
  {
    nome: "equipe",
    rotulo: "Falta de funcionário",
    descricao: "Falta, atestado e equipe abaixo do mínimo hoje ou amanhã.",
    hora: { nome: "equipeHora", rotulo: "Avisar a partir de" },
  },
  { nome: "desperdicio", rotulo: "Desperdício", descricao: "Produção perdida, com o motivo e quem registrou." },
];

/** Relatórios: em horário marcado ou quando fecha o período. */
const RELATORIOS: Opcao[] = [
  { nome: "vendas", rotulo: "Relatório de vendas", descricao: "Quando um fechamento é feito: faturamento, CMV e os pratos mais vendidos." },
  {
    nome: "resumoDiario",
    rotulo: "Resumo de ontem",
    descricao: "Produções, perdas, checklists, insumos abaixo do mínimo e pedidos esperando compra.",
    hora: { nome: "resumoHora", rotulo: "Mandar às" },
  },
  {
    nome: "checklistAbertura",
    rotulo: "Abertura atrasada",
    descricao: "Se o checklist de abertura não terminar até o horário.",
    hora: { nome: "checklistAberturaAte", rotulo: "Avisar a partir de" },
  },
];

export function SecaoAvisos() {
  const { dados } = useConfiguracoes();
  if (!dados.avisos) return null;
  return (
    <div className="space-y-4">
      <BlocoQuemRecebe />
      <BlocoOQueAvisar />
      <BlocoHistorico />
    </div>
  );
}

function BlocoQuemRecebe() {
  const { dados, demo } = useConfiguracoes();
  const lista = dados.avisos!.destinatarios;
  const algum = lista.some((d) => d.whatsapp);
  return (
    <Bloco
      titulo="Quem recebe"
      descricao={
        <>
          Dono e gestores com o WhatsApp ativado no agente. Cada pessoa ativa o próprio número em <strong className="font-medium text-[var(--tinta)]">Agente IA → WhatsApp</strong>.
        </>
      }
    >
      {!algum && (
        <p role="status" className="text-[13px] rounded-lg px-3 py-2.5 mb-3 flex gap-2" style={{ background: "color-mix(in srgb, var(--aviso) 10%, transparent)", color: "var(--tinta)" }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden /> Ninguém recebe ainda: ative um WhatsApp no Agente IA.
        </p>
      )}
      <ul>
        {lista.map((d) => (
          <li key={d.nome} className="py-2.5 flex items-center justify-between gap-3 border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[var(--tinta)] truncate">{d.nome}</div>
              <div className="text-[12.5px] text-[var(--tinta-faint)]">{ROTULO_PAPEL[d.papel]}</div>
            </div>
            {d.whatsapp ? (
              <span className="text-[13px] text-[var(--tinta-sub)] inline-flex items-center gap-1.5" style={{ fontVariantNumeric: "tabular-nums" }}>
                <CheckCircle2 size={15} style={{ color: "var(--sucesso)" }} aria-hidden />
                {formatarTelefone(d.whatsapp)}
              </span>
            ) : (
              <span className="text-[13px] text-[var(--tinta-faint)]">WhatsApp não ativado</span>
            )}
          </li>
        ))}
      </ul>
      {demo && <p className="text-[12.5px] text-[var(--tinta-faint)] mt-2">Na demonstração nada é enviado.</p>}
    </Bloco>
  );
}

function BlocoOQueAvisar() {
  const { dados, acoes, recarregar } = useConfiguracoes();
  const base = dados.avisos!.config;
  const [c, setC] = useState<ConfigAvisos>(base);
  const [silencio, setSilencio] = useState(!!base.silencioInicio);
  const [estado, salvar, pendente] = useActionState(acoes.salvarAvisos, {} as EstadoForm);
  const [erros, setErros] = useState<Record<string, string>>({});
  const chave = JSON.stringify(base);
  useEffect(() => {
    const b = JSON.parse(chave) as ConfigAvisos;
    setC(b);
    setSilencio(!!b.silencioInicio);
  }, [chave]);
  useEffect(() => setErros(estado.erros ?? {}), [estado]);
  useAvisoDaAcao(estado, recarregar);

  const atual: ConfigAvisos = {
    ...c,
    silencioInicio: silencio ? c.silencioInicio ?? "23:00" : null,
    silencioFim: silencio ? c.silencioFim ?? "06:00" : null,
  };
  const alterado = JSON.stringify(atual) !== chave;
  const muda = <K extends keyof ConfigAvisos>(k: K, v: ConfigAvisos[K]) => {
    setC((a) => ({ ...a, [k]: v }));
    setErros({});
  };

  return (
    <form action={salvar} noValidate>
      <Bloco titulo="O que avisar" descricao="O sistema confere a cada 5 minutos e manda uma vez só cada aviso." rodape={<RodapeSalvar alterado={alterado} pendente={pendente} />}>
        <div className="space-y-6">
          <Grupo titulo="Problemas pra resolver" descricao="Chegam na hora em que acontecem; vários juntos viram um aviso só.">
            {PROBLEMAS.map((o) => (
              <LinhaOpcao key={o.nome} opcao={o} c={c} muda={muda} erros={erros} />
            ))}
          </Grupo>
          <Grupo titulo="Relatórios">
            {RELATORIOS.map((o) => (
              <LinhaOpcao key={o.nome} opcao={o} c={c} muda={muda} erros={erros} />
            ))}
          </Grupo>
          <div className="border-t pt-5" style={{ borderColor: "var(--linha)" }}>
            <Interruptor
              nome="silencio"
              rotulo="Horário de silêncio"
              descricao="Nenhum aviso sai nesse horário; o que acontecer chega junto quando terminar."
              ligado={silencio}
              aoMudar={(v) => {
                setSilencio(v);
                setErros({});
              }}
            />
            {silencio && (
              <div className="flex flex-wrap gap-3 mt-3">
                <Campo
                  rotulo="De"
                  name="silencioInicio"
                  type="time"
                  required
                  className="w-[10rem]"
                  value={atual.silencioInicio ?? ""}
                  onChange={(e) => muda("silencioInicio", e.target.value)}
                  erro={erros.silencioInicio}
                />
                <Campo
                  rotulo="Até"
                  name="silencioFim"
                  type="time"
                  required
                  className="w-[10rem]"
                  value={atual.silencioFim ?? ""}
                  onChange={(e) => muda("silencioFim", e.target.value)}
                  erro={erros.silencioFim}
                />
              </div>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--tinta-faint)] border-t pt-4" style={{ borderColor: "var(--linha)" }}>
            Temperatura e higiene não entram aqui: quem cobra é a nutricionista.
          </p>
        </div>
      </Bloco>
    </form>
  );
}

function Grupo({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-semibold text-[var(--tinta)]">{titulo}</legend>
      {descricao && <p className="text-[12.5px] text-[var(--tinta-faint)] mt-0.5">{descricao}</p>}
      <div className="mt-3 rounded-xl border divide-y" style={{ borderColor: "var(--linha)" }}>
        {children}
      </div>
    </fieldset>
  );
}

function LinhaOpcao({
  opcao: o,
  c,
  muda,
  erros,
}: {
  opcao: Opcao;
  c: ConfigAvisos;
  muda: <K extends keyof ConfigAvisos>(k: K, v: ConfigAvisos[K]) => void;
  erros: Record<string, string>;
}) {
  const ligado = c[o.nome];
  return (
    <div className="px-4 py-3.5" style={{ borderColor: "var(--linha)" }}>
      <Interruptor nome={o.nome} rotulo={o.rotulo} descricao={o.descricao} ligado={ligado} aoMudar={(v) => muda(o.nome, v)} />
      {o.hora &&
        (ligado ? (
          <Campo
            rotulo={o.hora.rotulo}
            name={o.hora.nome}
            type="time"
            required
            className="max-w-[10rem] mt-3"
            value={c[o.hora.nome]}
            onChange={(e) => muda(o.hora!.nome, e.target.value)}
            erro={erros[o.hora.nome]}
          />
        ) : (
          <input type="hidden" name={o.hora.nome} value={c[o.hora.nome]} />
        ))}
    </div>
  );
}

const STATUS: Record<AvisoEnviado["status"], { rotulo: string; cor: string }> = {
  enviado: { rotulo: "Enviado", cor: "var(--sucesso)" },
  pendente: { rotulo: "Na fila", cor: "var(--tinta-faint)" },
  enviando: { rotulo: "Enviando", cor: "var(--tinta-faint)" },
  falhou: { rotulo: "Não enviado", cor: "var(--danger)" },
};

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = dataBR(d, { hour: "2-digit", minute: "2-digit" });
  return mesmoDia ? `hoje, ${hora}` : `${dataBR(d, { day: "2-digit", month: "2-digit" })}, ${hora}`;
}

function BlocoHistorico() {
  const { dados } = useConfiguracoes();
  const historico = dados.avisos!.historico;
  return (
    <Bloco titulo="Últimos avisos" descricao="Os 15 mais recentes, com quem recebeu e se chegou.">
      {historico.length === 0 ? (
        <p className="text-[13.5px] text-[var(--tinta-sub)] flex items-center gap-2">
          <Clock size={16} className="text-[var(--tinta-faint)]" aria-hidden /> Nenhum aviso ainda. Quando algo acontecer, aparece aqui.
        </p>
      ) : (
        <ul>
          {historico.map((a) => {
            const t = ROTULO_TIPO[a.tipo];
            const s = STATUS[a.status];
            const Icone = t.icone;
            return (
              <li key={a.id} className="py-2.5 flex items-start gap-3 border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
                <Icone size={17} className="mt-0.5 shrink-0 text-[var(--tinta-faint)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-[var(--tinta)]">{t.rotulo}</div>
                  <div className="text-[12.5px] text-[var(--tinta-faint)]">
                    para {a.para} · {quando(a.criadoEm)}
                    {a.erro && a.status === "falhou" ? ` · ${a.erro}` : ""}
                  </div>
                </div>
                <span className="text-[12.5px] font-medium inline-flex items-center gap-1.5 shrink-0 text-[var(--tinta-sub)]">
                  <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: s.cor }} />
                  {s.rotulo}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Bloco>
  );
}
