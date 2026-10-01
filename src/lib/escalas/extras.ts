// PERFIL (2026-09-27): banco de extras e matchmaking. Quando alguém falta, o
// motor de escalas gera um alerta de contingência com o perfil de quem faltou
// (setor, cargo, nível e praças do prontuário de competências). Aqui esse
// perfil é cruzado com o banco de extras:
//  - só extras ativos do mesmo setor;
//  - nível igual ou acima do de quem faltou (sem nível informado, não entra
//    quando a vaga pede nível);
//  - pelo menos uma praça em comum (ou, se quem faltou não tem praças no
//    prontuário, o mesmo cargo).
// Ordem: cobre todas as praças > mais praças em comum > mesmo cargo > nível
// mais próximo (não chamar especialista pra vaga de júnior à toa) > aceita
// WhatsApp > nome. O disparo automático (n8n/WhatsApp) é a fase 3; a tela já
// mostra os compatíveis com ligar/WhatsApp manual.
import { ORDEM_NIVEL, chaveTag, tagsUnicas } from "./perfil";
import { telefoneValido } from "@/lib/telefone";
import type { Nivel, PerfilVaga, Setor } from "./tipos";

export interface Extra {
  id: string;
  nome: string;
  telefone: string;
  setor: Setor;
  cargos: string[];
  nivel: Nivel | null;
  pracas: string[];
  aceitaWhatsapp: boolean;
  consentimentoEm: string | null;
  ativo: boolean;
  nota: string | null;
}

export type ExtraInput = Omit<Extra, "id" | "consentimentoEm">;

export interface Candidato {
  extra: Extra;
  pracasEmComum: string[];
  pracasFaltando: string[];
  mesmoCargo: boolean;
  /** Cobre todas as praças de quem faltou. */
  completo: boolean;
}

export function extrasCompativeis(vaga: PerfilVaga, extras: Extra[]): Candidato[] {
  const pedidas = tagsUnicas(vaga.habilidades);
  const cargo = chaveTag(vaga.cargo);
  const out: Candidato[] = [];
  for (const e of extras) {
    if (!e.ativo || e.setor !== vaga.setor) continue;
    if (vaga.nivel && (!e.nivel || ORDEM_NIVEL[e.nivel] < ORDEM_NIVEL[vaga.nivel])) continue;
    const dele = new Set(e.pracas.map(chaveTag));
    const emComum = pedidas.filter((p) => dele.has(chaveTag(p)));
    const faltando = pedidas.filter((p) => !dele.has(chaveTag(p)));
    const mesmoCargo = e.cargos.some((c) => chaveTag(c) === cargo);
    if (pedidas.length > 0 ? emComum.length === 0 : !mesmoCargo) continue;
    out.push({ extra: e, pracasEmComum: emComum, pracasFaltando: faltando, mesmoCargo, completo: faltando.length === 0 });
  }
  const distancia = (c: Candidato) => (vaga.nivel && c.extra.nivel ? ORDEM_NIVEL[c.extra.nivel] - ORDEM_NIVEL[vaga.nivel] : 0);
  return out.sort(
    (a, b) =>
      Number(b.completo) - Number(a.completo) ||
      b.pracasEmComum.length - a.pracasEmComum.length ||
      Number(b.mesmoCargo) - Number(a.mesmoCargo) ||
      distancia(a) - distancia(b) ||
      Number(b.extra.aceitaWhatsapp) - Number(a.extra.aceitaWhatsapp) ||
      a.extra.nome.localeCompare(b.extra.nome),
  );
}

export { formatarTelefone, normalizarTelefone } from "@/lib/telefone";

export function validarExtra(e: ExtraInput): string | null {
  if (!e.nome.trim()) return "Informe o nome.";
  if (e.nome.trim().length > 80) return "Nome com no máximo 80 caracteres.";
  if (!telefoneValido(e.telefone)) return "Telefone com DDD (ex.: 11 98765-4321).";
  if (!["cozinha", "salao", "bar", "outro"].includes(e.setor)) return "Escolha o setor.";
  if (e.cargos.length === 0) return "Informe pelo menos um cargo que a pessoa cobre.";
  if (e.cargos.length > 10 || e.cargos.some((c) => c.length > 40)) return "Até 10 cargos, com até 40 caracteres cada.";
  if (e.pracas.length > 20 || e.pracas.some((p) => p.length > 40)) return "Até 20 praças, com até 40 caracteres cada.";
  if (e.nivel !== null && !(e.nivel in ORDEM_NIVEL)) return "Nível inválido.";
  if (e.nota && e.nota.length > 500) return "Observação com no máximo 500 caracteres.";
  return null;
}

/** Mensagem pronta pro WhatsApp (o gestor revisa antes de mandar). */
export function mensagemConvite(extra: Pick<Extra, "nome">, vaga: { cargo: string; data: string }, restaurante: string): string {
  const [a, m, d] = vaga.data.split("-");
  return `Oi, ${extra.nome.split(" ")[0]}! Aqui é do ${restaurante}. Precisamos de ${vaga.cargo.toLowerCase()} no dia ${d}/${m}/${a}. Você consegue? Responde aqui que eu te passo o horário.`;
}
