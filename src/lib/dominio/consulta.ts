// CELULAR (2026-09-26): link só de consulta do pessoal da cozinha. O gestor
// gera um link por pessoa (tela Equipe) e manda no WhatsApp; no celular dela
// abre a própria escala, as fichas (sem custo) e os checklists do dia, sem
// registrar nada. Tipos e contas puras (sem Supabase), pra ir pro navegador.
// O que o link recebe do banco: public.consulta_por_link
// (supabase/migrations/20260928140000_link_consulta.sql).
import type { FichaCozinha } from "./cozinha";
import type { Checklist } from "./checklist";
import type { EscalaPublica, SituacaoPublica } from "@/lib/escalas/publica";
import type { DataISO } from "@/lib/escalas/tipos";
import { paraDia } from "@/lib/escalas/datas";

/** Link ativo de uma pessoa, como o gestor vê na tela Equipe. */
export interface LinkConsulta {
  funcionarioId: string;
  criadoEm: string;
  /** Última vez que a pessoa abriu (null = ainda não abriu). */
  ultimoAcessoEm: string | null;
}

export interface DiaMeu {
  data: DataISO;
  /** null = fora do contrato (antes de entrar ou depois de sair). */
  situacao: SituacaoPublica | null;
}

export interface MinhaEscala {
  turno: { inicio: string; fim: string } | null;
  /** De hoje até o fim do período calculado (umas 5 semanas). */
  dias: DiaMeu[];
}

export interface ConsultaFuncionario {
  restaurante: string;
  pessoa: { id: string; nome: string; cargo: string | null };
  hoje: DataISO;
  /** null = a pessoa não tem escala cadastrada ou a escala está em revisão. */
  escala: MinhaEscala | null;
  fichas: FichaCozinha[];
  checklists: Checklist[];
}

/** Só a escala da pessoa, de hoje em diante. Os outros não vão pro celular. */
export function minhaEscala(escala: EscalaPublica | null, pessoaId: string, hoje: DataISO): MinhaEscala | null {
  if (!escala) return null;
  const pessoa = escala.pessoas.find((p) => p.id === pessoaId);
  const dias = escala.dias[pessoaId];
  if (!pessoa || !dias) return null;
  const i0 = paraDia(escala.inicio);
  const desde = Math.max(0, paraDia(hoje) - i0);
  const meus = dias.slice(desde).map((d, i) => ({ data: d?.data ?? isoDoIndice(escala.inicio, desde + i), situacao: d?.situacao ?? null }));
  return { turno: pessoa.turno, dias: meus };
}

function isoDoIndice(inicio: DataISO, i: number): DataISO {
  const d = new Date(`${inicio}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

/** Próximo dia de folga depois de hoje (férias não conta). */
export function proximaFolga(escala: MinhaEscala): DiaMeu | null {
  return escala.dias.slice(1).find((d) => d.situacao === "folga") ?? null;
}

/** "10h–18h20". */
export function textoTurno(turno: { inicio: string; fim: string } | null): string | null {
  if (!turno?.inicio || !turno?.fim) return null;
  const h = (x: string) => {
    const [hh, mm] = x.split(":");
    return mm === "00" || mm === undefined ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
  };
  return `${h(turno.inicio)}–${h(turno.fim)}`;
}

/** Texto pronto pro WhatsApp do gestor. */
export function mensagemConvite(nome: string, restaurante: string, link: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] || nome.trim();
  return (
    `Oi, ${primeiro}! Este é o seu link do ${restaurante} pra ver no celular a sua escala, as fichas técnicas e os checklists do dia:\n` +
    `${link}\n` +
    `É só pra consulta e é só seu: não repasse.`
  );
}

export function linkWhatsAppConvite(nome: string, restaurante: string, link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagemConvite(nome, restaurante, link))}`;
}
