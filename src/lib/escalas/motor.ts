// ESCALAS (2026-09-26): motor de escalas. Função pura: recebe equipe,
// prontuário, regras e período; devolve o dia a dia de cada pessoa e os
// alertas (contingência, cobertura, restrições, ajustes). Não grava nada.
//
// Ordem das regras, da mais forte pra mais fraca:
//  1. Contrato: antes da admissão / depois do desligamento não há escala.
//  2. Lei: no máximo `maxDiasSeguidos` (6) dias seguidos de trabalho; se o
//     plano passar disso, entra uma folga compensatória num dia seg–qui.
//  3. Sexta e sábado protegidos (5x2 e 6x1): folga calculada nesses dias vira
//     trabalho e a folga vai pro dia seg–qui mais próximo.
//  4. Folgas regulares só de segunda a quinta; domingo de folga só pelo rodízio.
//  5. Rodízio de domingo: dentro da mesma equipe (setor + cargo), cada pessoa
//     folga 1 domingo a cada N semanas, em turnos alternados, pra praça nunca
//     ficar vazia e todo mundo ter o mesmo número de domingos.
//  6. 12x36 e 24x48 não se movem (o descanso de 36h/48h é o próprio regime);
//     sexta/sábado dessas pessoas é garantido pela cobertura da equipe.
//  7. Prontuário por cima: falta/atestado viram contingência; afastamento e
//     férias tiram a pessoa; restrição "sem_escala_longa" troca 12x36/24x48
//     por 5x2 enquanto durar.
//  8. Cobertura mínima por equipe, dia a dia.

import { NOME_DIA, diaDaSemana, mod, paraDia, paraISO, semanaAbsoluta } from "./datas";
import type {
  Alerta,
  DataISO,
  DiaEscala,
  DiaSemana,
  FuncionarioEscala,
  Ocorrencia,
  RegrasEscala,
  ResultadoEscala,
  SituacaoDia,
  TipoEscala,
} from "./tipos";

export const REGRAS_PADRAO: RegrasEscala = {
  diasProtegidos: [5, 6],
  diasFolgaPermitidos: [1, 2, 3, 4],
  // Comércio em geral: domingo de folga pelo menos 1 vez a cada 3 semanas
  // (Lei 10.101/2000, art. 6º, parágrafo único). Convenção coletiva pode
  // mudar isso; por isso é configurável.
  intervaloDomingoSemanas: 3,
  maxDiasSeguidos: 6,
  coberturaMinima: {},
};

/** Dias antes do período usados só pra conferir dias seguidos na virada. */
const AQUECIMENTO = 14;

export const chaveEquipe = (f: Pick<FuncionarioEscala, "setor" | "cargo">) => `${f.setor}:${f.cargo}`;

const semanal = (t: TipoEscala) => t === "5x2" || t === "6x1";

interface Remanejo {
  de: DiaSemana;
  para: DiaSemana;
}

/** Folgas regulares da semana (5x2: 2, 6x1: 1), sempre em dias permitidos. */
export function folgasDaSemana(
  escala: { tipo: TipoEscala; ancora: DataISO; folgasPreferidas?: DiaSemana[] },
  tipo: "5x2" | "6x1",
  regras: RegrasEscala,
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
  const permitidos = regras.diasFolgaPermitidos;
  const usadas: DiaSemana[] = [];
  const remanejos: Remanejo[] = [];
  for (const d of brutas) {
    if (permitidos.includes(d) && !usadas.includes(d)) {
      usadas.push(d);
      continue;
    }
    // Dia permitido mais próximo; no empate, o anterior (quinta antes de segunda).
    const candidatos = permitidos
      .filter((p) => !usadas.includes(p))
      .map((p) => ({ p, dist: Math.min(mod(d - p, 7), mod(p - d, 7)), antes: mod(d - p, 7) <= mod(p - d, 7) }))
      .sort((x, y) => x.dist - y.dist || Number(y.antes) - Number(x.antes));
    if (candidatos[0]) {
      usadas.push(candidatos[0].p);
      remanejos.push({ de: d, para: candidatos[0].p });
    }
  }
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

function restritoALongas(ocs: Ocorrencia[], dia: number): boolean {
  return ocorrenciasNoDia(ocs, dia).some((o) => o.tipo === "restricao" && o.restricoes?.includes("sem_escala_longa"));
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

  // --- Rodízio de domingo: posição de cada pessoa na fila da sua equipe. ---
  // Recalculado a cada domingo com quem está ativo naquele dia, então
  // admissão e desligamento reequilibram a fila sozinhos.
  const equipes = new Map<string, FuncionarioEscala[]>();
  for (const f of entrada.funcionarios) {
    const k = chaveEquipe(f);
    equipes.set(k, [...(equipes.get(k) ?? []), f]);
  }
  const folgaNoDomingo = (f: FuncionarioEscala, domingo: number): boolean => {
    const fila = (equipes.get(chaveEquipe(f)) ?? [])
      .filter((x) => semanal(x.escala.tipo) && ativoNoDia(x, domingo))
      .sort((a, b) => a.admissao.localeCompare(b.admissao) || a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const i = fila.findIndex((x) => x.id === f.id);
    if (i < 0) return false;
    const n = Math.max(1, Math.round(f.escala.intervaloDomingoSemanas ?? regras.intervaloDomingoSemanas));
    return mod(semanaAbsoluta(domingo) + i, n) === 0;
  };

  const porFuncionario: Record<string, DiaEscala[]> = {};

  for (const f of entrada.funcionarios) {
    const ocs = ocorrencias.filter((o) => o.funcionarioId === f.id);
    const dias: DiaEscala[] = [];
    const avisos = new Set<string>();

    // Avisos de configuração (uma vez por pessoa).
    const nDomingo = f.escala.intervaloDomingoSemanas ?? regras.intervaloDomingoSemanas;
    if (semanal(f.escala.tipo) && nDomingo > 3) {
      alertas.push({
        tipo: "legal",
        severidade: "atencao",
        funcionarioId: f.id,
        mensagem: `${f.nome}: domingo de folga a cada ${nDomingo} semanas. Pra comércio em geral a lei pede pelo menos 1 a cada 3 (Lei 10.101/2000, art. 6º); confirme na convenção coletiva.`,
      });
    }
    if (!semanal(f.escala.tipo)) {
      alertas.push({
        tipo: "legal",
        severidade: "info",
        funcionarioId: f.id,
        mensagem: `${f.nome} (${f.escala.tipo}): os dias alternam e não dá pra mover folga de sexta ou sábado sem quebrar o descanso do regime. Sexta e sábado ficam garantidos pela cobertura da equipe.`,
      });
    }

    for (let dia = dA; dia <= d1; dia++) {
      const data = paraISO(dia);
      if (!ativoNoDia(f, dia)) {
        dias.push({ data, situacao: "fora_do_contrato" });
        continue;
      }
      const restrito = restritoALongas(ocs, dia) && !semanal(f.escala.tipo);
      const tipo: TipoEscala = restrito ? "5x2" : f.escala.tipo;
      const wd = diaDaSemana(dia);

      if (tipo === "12x36" || tipo === "24x48") {
        const ciclo = tipo === "12x36" ? 2 : 3;
        dias.push({ data, situacao: mod(dia - paraDia(f.escala.ancora), ciclo) === 0 ? "trabalho" : "folga" });
        continue;
      }

      const { folgas, remanejos } = folgasDaSemana(f.escala, tipo, regras);
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
      let folgasSemana = folgas;
      if (semanaDeRodizio && tipo === "5x2") folgasSemana = folgas.slice(0, -1);

      let situacao: SituacaoDia = "trabalho";
      let ajuste: string | undefined;
      if (wd === 0 && semanaDeRodizio) situacao = "folga_domingo";
      else if (folgasSemana.includes(wd)) situacao = "folga";
      const remanejado = remanejos.find((r) => r.de === wd);
      if (remanejado && situacao === "trabalho") {
        ajuste = regras.diasProtegidos.includes(wd)
          ? `Folga remanejada para ${NOME_DIA[remanejado.para]}: ${NOME_DIA[wd]} é dia de pico.`
          : `Folga remanejada para ${NOME_DIA[remanejado.para]}: domingo de folga só pelo rodízio.`;
      }
      dias.push({ data, situacao, ...(ajuste ? { ajuste } : {}) });
    }

    // --- Lei: no máximo N dias seguidos. Corrige com folga compensatória. ---
    let seguidos = 0;
    for (let i = 0; i < dias.length; i++) {
      if (dias[i].situacao !== "trabalho") {
        seguidos = 0;
        continue;
      }
      seguidos++;
      if (seguidos <= regras.maxDiasSeguidos) continue;
      // Último dia permitido (seg–qui, fora dos protegidos) dentro da sequência.
      let escolhido = -1;
      for (let j = i; j > i - seguidos; j--) {
        const wd = diaDaSemana(paraDia(dias[j].data));
        if (regras.diasFolgaPermitidos.includes(wd) && !regras.diasProtegidos.includes(wd)) {
          escolhido = j;
          break;
        }
      }
      if (escolhido < 0) escolhido = i; // não acontece com seg–qui permitidos; garante a lei
      dias[escolhido] = {
        data: dias[escolhido].data,
        situacao: "folga_compensatoria",
        ajuste: `Folga compensatória: seriam mais de ${regras.maxDiasSeguidos} dias seguidos de trabalho.`,
      };
      seguidos = i - escolhido;
    }

    // --- Prontuário por cima do plano. ---
    for (const d of dias) {
      const dia = paraDia(d.data);
      if (dia < d0 || d.situacao === "fora_do_contrato") continue;
      for (const o of ocorrenciasNoDia(ocs, dia)) {
        if (o.tipo === "afastamento") d.situacao = "afastado";
        else if (o.tipo === "ferias") d.situacao = "ferias";
        else if ((o.tipo === "falta" || o.tipo === "atestado") && d.situacao === "trabalho") {
          d.situacao = o.tipo;
          alertas.push({
            tipo: "contingencia",
            severidade: "critico",
            data: d.data,
            funcionarioId: f.id,
            equipe: chaveEquipe(f),
            mensagem: `${f.nome} (${f.cargo}) ${o.tipo === "falta" ? "faltou" : "está de atestado"} em ${d.data}: buscar extra com o mesmo perfil.`,
            perfil: { setor: f.setor, cargo: f.cargo, nivel: f.nivel, habilidades: f.habilidades ?? [] },
          });
        }
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
            mensagem: `${f.nome} tem restrição para trabalho noturno até ${o.fim}, mas o turno vai até ${f.escala.turno!.fim}. Ajuste o turno.`,
          });
        }
      }
    }

    porFuncionario[f.id] = dias.filter((d) => paraDia(d.data) >= d0);
  }

  // --- Cobertura mínima por equipe, dia a dia. ---
  for (const [equipe, minimo] of Object.entries(regras.coberturaMinima)) {
    const membros = equipes.get(equipe) ?? [];
    if (minimo <= 0) continue;
    for (let dia = d0; dia <= d1; dia++) {
      const data = paraISO(dia);
      const trabalhando = membros.filter((m) => porFuncionario[m.id]?.[dia - d0]?.situacao === "trabalho").length;
      if (trabalhando >= minimo) continue;
      const pico = regras.diasProtegidos.includes(diaDaSemana(dia));
      const ref = membros[0];
      alertas.push({
        tipo: "cobertura",
        severidade: pico ? "critico" : "atencao",
        data,
        equipe,
        faltam: minimo - trabalhando,
        mensagem: `${equipe.split(":")[1]}: ${trabalhando} de ${minimo} em ${NOME_DIA[diaDaSemana(dia)]} ${data}${pico ? " (dia de pico)" : ""}. Faltam ${minimo - trabalhando}.`,
        ...(ref ? { perfil: { setor: ref.setor, cargo: ref.cargo, habilidades: [] } } : {}),
      });
    }
  }

  return { porFuncionario, alertas };
}
