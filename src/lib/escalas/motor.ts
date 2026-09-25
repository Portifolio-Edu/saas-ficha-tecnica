// ESCALAS (2026-09-26): motor de escalas. Função pura: recebe equipe,
// prontuário, regras e período; devolve o dia a dia de cada pessoa e os
// alertas (contingência, cobertura, restrições, ajustes). Não grava nada.
//
// Regras INEGOCIÁVEIS (não são configuráveis de propósito):
//  - Cozinha, salão e bar NUNCA folgam sexta ou sábado. Por isso esses
//    setores só trabalham em 5x2 ou 6x1: 12x36 e 24x48 alternam os dias e
//    fariam a folga cair na sexta semana sim, semana não (o banco também
//    bloqueia essa combinação). Ao final, `garantirSextaSabado` confere cada
//    dia e lança erro se algum caminho do motor tiver gerado folga ali.
//  - Folga regular só de segunda a quinta; domingo de folga só pelo rodízio.
//  - No máximo 6 dias seguidos de trabalho (CLT: o 7º é repouso); se o plano
//    passar disso, entra folga compensatória num dia de segunda a quinta.
//
// Ordem de aplicação:
//  1. Contrato: antes da admissão / depois do desligamento não há escala.
//  2. Regime: 5x2 e 6x1 com folgas seg–qui (folga calculada em outro dia é
//     remanejada pro seg–qui mais próximo); 12x36 e 24x48 alternados (só
//     setores de apoio).
//  3. Rodízio de domingo por equipe (setor + cargo), com equidade.
//  4. Máximo de 6 dias seguidos.
//  5. Prontuário por cima: falta/atestado viram contingência; afastamento,
//     férias e ausência tiram a pessoa; restrição "sem_escala_longa" troca
//     12x36/24x48 por 5x2 enquanto durar.
//  6. Cobertura mínima por equipe, dia a dia.

import { NOME_DIA, diaDaSemana, mod, paraDia, paraISO, rotuloData, semanaAbsoluta } from "./datas";
import type {
  Alerta,
  DataISO,
  DiaEscala,
  DiaSemana,
  FuncionarioEscala,
  Ocorrencia,
  RegrasEscala,
  ResultadoEscala,
  Setor,
  SituacaoDia,
  TipoEscala,
} from "./tipos";

/** Sexta e sábado: dias de pico, sem folga nos setores protegidos. */
export const DIAS_PROTEGIDOS: readonly DiaSemana[] = [5, 6];
/** Folgas regulares: segunda a quinta. */
export const DIAS_FOLGA: readonly DiaSemana[] = [1, 2, 3, 4];
export const MAX_DIAS_SEGUIDOS = 6;
/** Setores que atendem o cliente no pico: sem folga sexta e sábado. */
export const SETORES_PROTEGIDOS: readonly Setor[] = ["cozinha", "salao", "bar"];

export const REGRAS_PADRAO: RegrasEscala = {
  // Comércio em geral: domingo de folga pelo menos 1 vez a cada 3 semanas
  // (Lei 10.101/2000, art. 6º, parágrafo único). Convenção coletiva pode
  // mudar isso; por isso é configurável.
  intervaloDomingoSemanas: 3,
  coberturaMinima: {},
};

const FOLGAS: readonly SituacaoDia[] = ["folga", "folga_domingo", "folga_compensatoria"];

/** Dias antes do período usados só pra conferir dias seguidos na virada. */
const AQUECIMENTO = 14;

export const chaveEquipe = (f: Pick<FuncionarioEscala, "setor" | "cargo">) => `${f.setor}:${f.cargo}`;

export const setorProtegido = (s: Setor) => SETORES_PROTEGIDOS.includes(s);

/** Regimes que um setor pode usar. */
export function regimesPermitidos(setor: Setor): TipoEscala[] {
  return setorProtegido(setor) ? ["5x2", "6x1"] : ["5x2", "6x1", "12x36", "24x48"];
}

const semanal = (t: TipoEscala) => t === "5x2" || t === "6x1";

interface Remanejo {
  de: DiaSemana;
  para: DiaSemana;
}

/** Folgas regulares da semana (5x2: 2, 6x1: 1), sempre de segunda a quinta. */
export function folgasDaSemana(
  escala: { ancora: DataISO; folgasPreferidas?: DiaSemana[] },
  tipo: "5x2" | "6x1",
): { folgas: DiaSemana[]; remanejos: Remanejo[] } {
  const n = tipo === "5x2" ? 2 : 1;
  let brutas: DiaSemana[];
  if (escala.folgasPreferidas && escala.folgasPreferidas.length > 0) {
    brutas = escala.folgasPreferidas.slice(0, n);
  } else {
    // Pela âncora: trabalha 7-n dias a partir dela e folga os n seguintes.
    const a = paraDia(escala.ancora);
    brutas = Array.from({ length: n }, (_, i) => diaDaSemana(a + 7 - n + i));
  }
  const usadas: DiaSemana[] = [];
  const remanejos: Remanejo[] = [];
  for (const d of brutas) {
    if (DIAS_FOLGA.includes(d) && !usadas.includes(d)) {
      usadas.push(d);
      continue;
    }
    // Dia permitido mais próximo; no empate, o anterior (quinta antes de segunda).
    const candidatos = DIAS_FOLGA.filter((p) => !usadas.includes(p))
      .map((p) => ({ p, dist: Math.min(mod(d - p, 7), mod(p - d, 7)), antes: mod(d - p, 7) <= mod(p - d, 7) }))
      .sort((x, y) => x.dist - y.dist || Number(y.antes) - Number(x.antes));
    if (candidatos[0]) {
      usadas.push(candidatos[0].p);
      remanejos.push({ de: d, para: candidatos[0].p });
    }
  }
  // Completa se vieram menos folgas preferidas do que o regime pede.
  for (const p of DIAS_FOLGA) if (usadas.length < n && !usadas.includes(p)) usadas.push(p);
  return { folgas: usadas.sort(), remanejos };
}

function ativoNoDia(f: FuncionarioEscala, dia: number): boolean {
  if (dia < paraDia(f.admissao)) return false;
  if (f.desligamento && dia > paraDia(f.desligamento)) return false;
  return true;
}

function ocorrenciasNoDia(ocs: Ocorrencia[], dia: number): Ocorrencia[] {
  return ocs.filter((o) => dia >= paraDia(o.inicio) && dia <= paraDia(o.fim));
}

const FORCA: Partial<Record<Ocorrencia["tipo"], number>> = {
  afastamento: 3,
  ausencia_prolongada: 3,
  ferias: 2,
  falta: 1,
  atestado: 1,
  ausencia: 1,
};

/** A ocorrência que manda no dia (restrição não muda a situação do dia). */
function ocorrenciaDoDia(ocs: Ocorrencia[], dia: number): Ocorrencia | undefined {
  let melhor: Ocorrencia | undefined;
  for (const o of ocorrenciasNoDia(ocs, dia)) {
    const forca = FORCA[o.tipo] ?? 0;
    if (forca === 0) continue;
    const atual = melhor ? (FORCA[melhor.tipo] ?? 0) : 0;
    if (forca > atual || (forca === atual && melhor && o.tipo < melhor.tipo)) melhor = o;
  }
  return melhor;
}

function restritoALongas(ocs: Ocorrencia[], dia: number): boolean {
  return ocorrenciasNoDia(ocs, dia).some((o) => o.tipo === "restricao" && o.restricoes?.includes("sem_escala_longa"));
}

/** Trava final: nenhum setor protegido folga sexta ou sábado. Se algum dia
 * o motor gerar isso, é bug — e é melhor quebrar do que publicar a escala. */
export function garantirSextaSabado(funcionarios: FuncionarioEscala[], porFuncionario: Record<string, DiaEscala[]>): void {
  for (const f of funcionarios) {
    if (!setorProtegido(f.setor)) continue;
    for (const d of porFuncionario[f.id] ?? []) {
      if (FOLGAS.includes(d.situacao) && DIAS_PROTEGIDOS.includes(diaDaSemana(paraDia(d.data)))) {
        throw new Error(`Escala inválida: ${f.nome} com folga em ${rotuloData(d.data)}.`);
      }
    }
  }
}

export function gerarEscala(entrada: {
  funcionarios: FuncionarioEscala[];
  ocorrencias?: Ocorrencia[];
  regras?: Partial<RegrasEscala>;
  inicio: DataISO;
  fim: DataISO;
}): ResultadoEscala {
  const regras: RegrasEscala = { ...REGRAS_PADRAO, ...entrada.regras };
  const ocorrencias = entrada.ocorrencias ?? [];
  const d0 = paraDia(entrada.inicio);
  const d1 = paraDia(entrada.fim);
  if (d1 < d0) throw new Error("O fim do período vem antes do início.");
  const dA = d0 - AQUECIMENTO;
  const alertas: Alerta[] = [];

  // Regime efetivo: setor protegido com 12x36/24x48 (não deveria existir: o
  // banco e o formulário bloqueiam) cai pra 5x2 e gera alerta crítico.
  const tipoBase = (f: FuncionarioEscala): TipoEscala =>
    setorProtegido(f.setor) && !semanal(f.escala.tipo) ? "5x2" : f.escala.tipo;

  // --- Rodízio de domingo: posição de cada pessoa na fila da sua equipe. ---
  // Recalculado a cada domingo com quem está ativo naquele dia, então
  // admissão e desligamento reequilibram a fila sozinhos.
  const equipes = new Map<string, FuncionarioEscala[]>();
  for (const f of entrada.funcionarios) {
    const k = chaveEquipe(f);
    equipes.set(k, [...(equipes.get(k) ?? []), f]);
  }
  const filas = new Map<string, string[]>();
  const folgaNoDomingo = (f: FuncionarioEscala, domingo: number): boolean => {
    const chave = `${chaveEquipe(f)}|${domingo}`;
    let fila = filas.get(chave);
    if (!fila) {
      fila = (equipes.get(chaveEquipe(f)) ?? [])
        .filter((x) => semanal(tipoBase(x)) && ativoNoDia(x, domingo))
        .sort((a, b) => a.admissao.localeCompare(b.admissao) || a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id))
        .map((x) => x.id);
      filas.set(chave, fila);
    }
    const i = fila.indexOf(f.id);
    if (i < 0) return false;
    const n = Math.max(1, Math.round(f.escala.intervaloDomingoSemanas ?? regras.intervaloDomingoSemanas));
    return mod(semanaAbsoluta(domingo) + i, n) === 0;
  };

  const porFuncionario: Record<string, DiaEscala[]> = {};

  for (const f of entrada.funcionarios) {
    const ocs = ocorrencias.filter((o) => o.funcionarioId === f.id);
    const dias: DiaEscala[] = [];
    const avisos = new Set<string>();
    const base = tipoBase(f);

    if (base !== f.escala.tipo) {
      alertas.push({
        tipo: "legal",
        severidade: "critico",
        funcionarioId: f.id,
        mensagem: `${f.nome}: ${f.escala.tipo} não é permitido em ${f.setor} (folga cairia na sexta ou no sábado). Calculado como 5x2 até corrigir o cadastro.`,
      });
    }
    const nDomingo = f.escala.intervaloDomingoSemanas ?? regras.intervaloDomingoSemanas;
    if (semanal(base) && nDomingo > 3) {
      alertas.push({
        tipo: "legal",
        severidade: "atencao",
        funcionarioId: f.id,
        mensagem: `${f.nome}: domingo de folga a cada ${nDomingo} semanas. Pra comércio em geral a lei pede pelo menos 1 a cada 3 (Lei 10.101/2000, art. 6º); confirme na convenção coletiva.`,
      });
    }

    for (let dia = dA; dia <= d1; dia++) {
      const data = paraISO(dia);
      if (!ativoNoDia(f, dia)) {
        dias.push({ data, situacao: "fora_do_contrato" });
        continue;
      }
      const restrito = restritoALongas(ocs, dia) && !semanal(base);
      const tipo: TipoEscala = restrito ? "5x2" : base;
      const wd = diaDaSemana(dia);

      if (tipo === "12x36" || tipo === "24x48") {
        const ciclo = tipo === "12x36" ? 2 : 3;
        dias.push({ data, situacao: mod(dia - paraDia(f.escala.ancora), ciclo) === 0 ? "trabalho" : "folga" });
        continue;
      }

      const { folgas, remanejos } = folgasDaSemana(f.escala, tipo);
      if (restrito && !avisos.has("restrito")) {
        avisos.add("restrito");
        alertas.push({
          tipo: "restricao",
          severidade: "atencao",
          funcionarioId: f.id,
          data: dia >= d0 ? data : entrada.inicio,
          mensagem: `${f.nome} tem restrição para escala longa: ${f.escala.tipo} trocada por 5x2 enquanto durar.`,
        });
      }
      if (remanejos.length > 0 && !avisos.has("remanejo")) {
        avisos.add("remanejo");
        alertas.push({
          tipo: "folga_remanejada",
          severidade: "info",
          funcionarioId: f.id,
          mensagem: `${f.nome}: ${remanejos.map((r) => `folga de ${NOME_DIA[r.de]} vai para ${NOME_DIA[r.para]}`).join("; ")} (folga só de segunda a quinta).`,
        });
      }

      // Semana de rodízio: domingo de folga. No 5x2 ele troca a última folga
      // regular da semana; no 6x1 soma (trocar deixaria mais de 6 dias seguidos).
      const domingoDaSemana = dia + mod(7 - wd, 7);
      const semanaDeRodizio = folgaNoDomingo(f, domingoDaSemana);
      const folgasSemana = semanaDeRodizio && tipo === "5x2" ? folgas.slice(0, -1) : folgas;

      let situacao: SituacaoDia = "trabalho";
      let ajuste: string | undefined;
      if (wd === 0 && semanaDeRodizio) situacao = "folga_domingo";
      else if (folgasSemana.includes(wd)) situacao = "folga";
      const remanejado = remanejos.find((r) => r.de === wd);
      if (remanejado && situacao === "trabalho") {
        ajuste = DIAS_PROTEGIDOS.includes(wd)
          ? `Folga remanejada para ${NOME_DIA[remanejado.para]}: ${NOME_DIA[wd]} é dia de pico.`
          : `Folga remanejada para ${NOME_DIA[remanejado.para]}: domingo de folga só pelo rodízio.`;
      }
      dias.push({ data, situacao, ...(ajuste ? { ajuste } : {}) });
    }

    // --- Lei: no máximo 6 dias seguidos. Corrige com folga compensatória. ---
    let seguidos = 0;
    for (let i = 0; i < dias.length; i++) {
      if (dias[i].situacao !== "trabalho") {
        seguidos = 0;
        continue;
      }
      seguidos++;
      if (seguidos <= MAX_DIAS_SEGUIDOS) continue;
      // Último dia seg–qui dentro da sequência (sempre existe numa sequência de 7).
      let escolhido = i;
      for (let j = i; j > i - seguidos; j--) {
        if (DIAS_FOLGA.includes(diaDaSemana(paraDia(dias[j].data)))) {
          escolhido = j;
          break;
        }
      }
      dias[escolhido] = {
        data: dias[escolhido].data,
        situacao: "folga_compensatoria",
        ajuste: `Folga compensatória: seriam mais de ${MAX_DIAS_SEGUIDOS} dias seguidos de trabalho.`,
      };
      seguidos = i - escolhido;
    }

    // --- Prontuário por cima do plano. ---
    // Se duas ocorrências caem no mesmo dia, vale a mais forte (não depende
    // da ordem em que vieram do banco): afastamento > férias > falta/atestado.
    // Falta e atestado só contam em dia de trabalho (em folga não mudam nada).
    for (const d of dias) {
      const dia = paraDia(d.data);
      if (dia < d0 || d.situacao === "fora_do_contrato") continue;
      const o = ocorrenciaDoDia(ocs, dia);
      if (!o) continue;
      if (o.tipo === "afastamento") d.situacao = "afastado";
      else if (o.tipo === "ausencia_prolongada") d.situacao = "ausente";
      else if (o.tipo === "ferias") d.situacao = "ferias";
      else if (d.situacao !== "trabalho") continue;
      else if (o.tipo === "ausencia") d.situacao = "ausente";
      else if (o.tipo === "falta" || o.tipo === "atestado") {
        d.situacao = o.tipo;
        alertas.push({
          tipo: "contingencia",
          severidade: "critico",
          data: d.data,
          funcionarioId: f.id,
          equipe: chaveEquipe(f),
          mensagem: `${f.nome} (${f.cargo}) ${o.tipo === "falta" ? "faltou" : "está de atestado"} em ${rotuloData(d.data)}: buscar extra com o mesmo perfil.`,
          perfil: { setor: f.setor, cargo: f.cargo, nivel: f.nivel, habilidades: f.habilidades ?? [] },
        });
      }
    }
    const temNoturno = f.escala.turno && (f.escala.turno.fim <= f.escala.turno.inicio || f.escala.turno.fim > "22:00");
    if (temNoturno) {
      for (const o of ocs) {
        if (o.tipo === "restricao" && o.restricoes?.includes("sem_noturno") && paraDia(o.fim) >= d0 && paraDia(o.inicio) <= d1) {
          alertas.push({
            tipo: "restricao",
            severidade: "atencao",
            funcionarioId: f.id,
            mensagem: `${f.nome} tem restrição para trabalho noturno até ${rotuloData(o.fim)}, mas o turno vai até ${f.escala.turno!.fim}. Ajuste o turno.`,
          });
        }
      }
    }

    porFuncionario[f.id] = dias.filter((d) => paraDia(d.data) >= d0);
  }

  garantirSextaSabado(entrada.funcionarios, porFuncionario);

  // --- Cobertura mínima por equipe, dia a dia. ---
  for (const [equipe, minimo] of Object.entries(regras.coberturaMinima)) {
    const membros = equipes.get(equipe) ?? [];
    if (!(minimo > 0) || membros.length === 0) continue;
    for (let dia = d0; dia <= d1; dia++) {
      const data = paraISO(dia);
      const trabalhando = membros.filter((m) => porFuncionario[m.id]?.[dia - d0]?.situacao === "trabalho").length;
      if (trabalhando >= minimo) continue;
      const pico = DIAS_PROTEGIDOS.includes(diaDaSemana(dia));
      const ref = membros[0];
      alertas.push({
        tipo: "cobertura",
        severidade: pico ? "critico" : "atencao",
        data,
        equipe,
        faltam: minimo - trabalhando,
        mensagem: `${ref.cargo}: ${trabalhando} de ${minimo} em ${rotuloData(data)}${pico ? " (dia de pico)" : ""}. Faltam ${minimo - trabalhando}.`,
        perfil: { setor: ref.setor, cargo: ref.cargo, habilidades: [] },
      });
    }
  }

  return { porFuncionario, alertas };
}
