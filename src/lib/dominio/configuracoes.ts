// CONFIGURAÇÕES (2026-10-03): tipos e regras puras da tela de Configurações
// (dados do restaurante, margem alvo, canais de venda e turnos). Sem import de
// Supabase: o formulário (cliente) e as server actions usam as mesmas regras.
// Os números do banco ficam em fração (0,65 = 65%); a tela fala em porcentagem.

export interface DadosRestaurante {
  nomeRestaurante: string;
  /** Nome de quem é dono da conta. */
  nome: string;
  /** Só leitura aqui: o telefone é a identidade do cadastro (único por restaurante). */
  telefone: string;
  cnpj: string | null;
  /** Fração: 0,65 = 65%. */
  margemAlvo: number;
}

export interface DadosRestauranteInput {
  nomeRestaurante: string;
  nome: string;
  cnpj: string | null;
  margemAlvo: number;
}

export interface CanalVendaConfig {
  id: string;
  nomeCanal: string;
  /** Fração: 0,12 = 12%. */
  comissaoPercentual: number;
  embala: boolean;
  ativo: boolean;
}

export interface CanalVendaInput {
  nomeCanal: string;
  comissaoPercentual: number;
  embala: boolean;
  ativo: boolean;
}

export interface TurnoInput {
  nome: string;
  horario: string | null;
}

/** Margem alvo aceita pelo banco: de 0 até menos de 100%. Na tela, de 1% a 95%. */
export const MARGEM_MIN_PCT = 1;
export const MARGEM_MAX_PCT = 95;

/** Comissão de canal: o banco aceita de 0 até menos de 100%; na tela, até 60%. */
export const COMISSAO_MAX_PCT = 60;

/** Nomes sugeridos pra criar um canal com um toque. Sem comissão: ela é do
 * contrato de cada restaurante e nunca vem preenchida por nós. */
export const CANAIS_SUGERIDOS: { nome: string; embala: boolean }[] = [
  { nome: "iFood", embala: true },
  { nome: "99Food", embala: true },
  { nome: "Delivery próprio", embala: true },
  { nome: "Retirada", embala: true },
];

/** "12,5" ou "12.5" → 12,5. Vazio ou lixo → null. */
export function lerNumeroPtBr(texto: string): number | null {
  const limpo = texto.trim().replace("%", "").replace(/\s/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Porcentagem digitada (65) → fração do banco (0,65), sem erro de ponto flutuante. */
export function pctParaFracao(pct: number): number {
  return Math.round(pct * 100) / 10000;
}

/** Fração do banco (0,65) → porcentagem da tela (65). */
export function fracaoParaPct(fracao: number): number {
  return Math.round(fracao * 10000) / 100;
}

export function digitosCnpj(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** 00.000.000/0000-00 (dígitos verificadores conferidos). Vazio não é válido aqui:
 * quem chama decide se o CNPJ é opcional. */
export function cnpjValido(texto: string): boolean {
  const d = digitosCnpj(texto);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((s, c, i) => s + Number(c) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

export function formatarCnpj(texto: string): string {
  const d = digitosCnpj(texto);
  if (d.length !== 14) return texto;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export type ResultadoValidacao<T> = { ok: true; valor: T } | { ok: false; erro: string };

export function validarRestaurante(entrada: { nomeRestaurante: string; nome: string; cnpj: string; margemAlvoPct: string }): ResultadoValidacao<DadosRestauranteInput> {
  const nomeRestaurante = entrada.nomeRestaurante.trim();
  const nome = entrada.nome.trim();
  if (!nomeRestaurante) return { ok: false, erro: "Informe o nome do restaurante." };
  if (!nome) return { ok: false, erro: "Informe o nome do responsável." };

  const pct = lerNumeroPtBr(entrada.margemAlvoPct);
  if (pct === null) return { ok: false, erro: "Informe a margem alvo em porcentagem, por exemplo 65." };
  if (pct < MARGEM_MIN_PCT || pct > MARGEM_MAX_PCT) {
    return { ok: false, erro: `A margem alvo precisa ficar entre ${MARGEM_MIN_PCT}% e ${MARGEM_MAX_PCT}%.` };
  }

  const cnpjTexto = entrada.cnpj.trim();
  if (cnpjTexto && !cnpjValido(cnpjTexto)) return { ok: false, erro: "O CNPJ não confere. Confira os 14 números ou deixe em branco." };

  return {
    ok: true,
    valor: { nomeRestaurante, nome, cnpj: cnpjTexto ? digitosCnpj(cnpjTexto) : null, margemAlvo: pctParaFracao(pct) },
  };
}

export function validarCanal(entrada: { nomeCanal: string; comissaoPct: string; embala: boolean; ativo: boolean }): ResultadoValidacao<CanalVendaInput> {
  const nomeCanal = entrada.nomeCanal.trim();
  if (!nomeCanal) return { ok: false, erro: "Informe o nome do canal." };
  if (nomeCanal.length > 40) return { ok: false, erro: "O nome do canal pode ter até 40 letras." };

  const pct = lerNumeroPtBr(entrada.comissaoPct);
  if (pct === null) return { ok: false, erro: "Informe a comissão do canal em porcentagem. Se não cobra comissão, digite 0." };
  if (pct < 0 || pct > COMISSAO_MAX_PCT) return { ok: false, erro: `A comissão precisa ficar entre 0% e ${COMISSAO_MAX_PCT}%.` };

  return { ok: true, valor: { nomeCanal, comissaoPercentual: pctParaFracao(pct), embala: entrada.embala, ativo: entrada.ativo } };
}

export function validarTurno(entrada: { nome: string; horario: string }): ResultadoValidacao<TurnoInput> {
  const nome = entrada.nome.trim();
  if (!nome) return { ok: false, erro: "Informe o nome do turno." };
  if (nome.length > 40) return { ok: false, erro: "O nome do turno pode ter até 40 letras." };
  const horario = entrada.horario.trim();
  return { ok: true, valor: { nome, horario: horario || null } };
}

/** Já existe um item com esse nome (sem diferenciar maiúscula nem acento)? `ignorarId` é o item em edição. */
export function nomeJaExiste(nome: string, existentes: { id: string; nome: string }[], ignorarId?: string): boolean {
  const chave = (s: string) => s.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
  const alvo = chave(nome);
  return existentes.some((e) => e.id !== ignorarId && chave(e.nome) === alvo);
}
