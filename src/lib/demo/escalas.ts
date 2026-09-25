// ESCALAS (2026-09-26): equipe e prontuário da demonstração (/preview/escalas
// e aba Escala do /preview/cozinha). As datas das ocorrências são relativas a
// hoje, pra demo sempre mostrar algo acontecendo nesta semana e na próxima:
//  - atestado do Marcos na próxima sexta → alerta de contingência (crítico);
//  - falta da Camila no último sábado;
//  - férias da Juliana daqui a duas semanas;
//  - afastamento do Gabriel nesta semana (a cozinha vê só "Ausente");
//  - restrição do Sérgio (apoio, 12x36) → vira 5x2 enquanto durar;
//  - Tânia só com o nome → aviso de cadastro incompleto.
// Onde mexer: aqui. Os ids f-ana, f-juliana, f-marcos e f-pedro são os mesmos
// do "Quem está usando" do tablet (equipeDemo.ts).
import { diaDaSemana, paraDia, paraISO } from "@/lib/escalas/datas";
import type { OcorrenciaRegistro, PessoaEscala } from "@/lib/escalas/cadastro";
import type { DataISO, DiaSemana, RegrasEscala, Setor, TipoEscala } from "@/lib/escalas/tipos";
import type { Nivel } from "@/lib/escalas/tipos";

function pessoa(
  id: string,
  nome: string,
  setor: Setor,
  cargo: string,
  nivel: Nivel | null,
  admissao: DataISO,
  tipo: TipoEscala,
  folgas: DiaSemana[],
  turno: [string, string],
  habilidades: string[] = [],
  ancora: DataISO = "2026-01-05",
): PessoaEscala {
  return {
    id,
    nome,
    setor,
    cargo,
    nivel,
    habilidades,
    admissao,
    desligamento: null,
    escala: { tipo, ancora, folgasPreferidas: folgas, turno: { inicio: turno[0], fim: turno[1] } },
  };
}

export function escalasDemoIniciais(hoje: DataISO): { pessoas: PessoaEscala[]; ocorrencias: OcorrenciaRegistro[]; regras: RegrasEscala } {
  const h = paraDia(hoje);
  const dow = diaDaSemana(h);
  const proximaSexta = h + ((5 - dow + 7) % 7);
  const ultimoSabado = h - (((dow - 6 + 7) % 7) || 7);
  const segundaQueVem = h - ((dow + 6) % 7) + 7;
  const d = (n: number) => paraISO(n);
  const criado = `${hoje}T09:00:00.000Z`;

  const pessoas: PessoaEscala[] = [
    pessoa("f-ana", "Ana Souza", "cozinha", "Chef de cozinha", "chefe", "2023-03-06", "6x1", [1], ["10:00", "18:20"], ["cozinha quente", "compras"]),
    pessoa("f-juliana", "Juliana Costa", "cozinha", "Cozinheiro", "senior", "2023-08-14", "6x1", [3], ["10:00", "18:20"], ["grelha", "molhos"]),
    pessoa("f-marcos", "Marcos Silva", "cozinha", "Cozinheiro", "pleno", "2024-02-01", "6x1", [2], ["14:00", "22:20"], ["grelha"]),
    pessoa("c-lucas", "Lucas Rocha", "cozinha", "Cozinheiro", "junior", "2025-05-12", "6x1", [4], ["14:00", "22:20"], ["fritura"]),
    pessoa("f-pedro", "Pedro Alves", "cozinha", "Auxiliar de cozinha", "auxiliar", "2024-09-02", "5x2", [1, 4], ["08:00", "16:48"], ["pré-preparo"]),
    pessoa("c-rafaela", "Rafaela Lima", "cozinha", "Auxiliar de cozinha", "auxiliar", "2025-01-20", "6x1", [2], ["14:00", "22:20"], ["pré-preparo", "confeitaria"]),
    pessoa("s-diego", "Diego Martins", "salao", "Maître", "senior", "2022-11-07", "5x2", [2, 3], ["11:00", "19:48"]),
    pessoa("s-bruno", "Bruno Tavares", "salao", "Garçom", "pleno", "2024-04-15", "6x1", [1], ["11:00", "19:20"], ["vinhos"]),
    pessoa("s-camila", "Camila Reis", "salao", "Garçom", "junior", "2025-03-03", "6x1", [3], ["15:00", "23:20"]),
    pessoa("b-fernanda", "Fernanda Dias", "bar", "Bartender", "pleno", "2024-06-10", "6x1", [2], ["16:00", "00:20"], ["coquetelaria"]),
    pessoa("b-thiago", "Thiago Barros", "bar", "Bartender", "junior", "2025-02-17", "6x1", [4], ["18:00", "02:20"], ["drinks clássicos"]),
    pessoa("b-gabriel", "Gabriel Nunes", "bar", "Barback", "auxiliar", "2025-07-01", "6x1", [4], ["16:00", "00:20"]),
    pessoa("o-sergio", "Sérgio Lopes", "outro", "Segurança", null, "2023-10-02", "12x36", [], ["18:00", "06:00"], [], "2026-01-01"),
    { id: "t-tania", nome: "Tânia Freitas", setor: null, cargo: null, nivel: null, habilidades: [], admissao: null, desligamento: null, escala: null },
  ];

  const ocorrencias: OcorrenciaRegistro[] = [
    { id: "oc-1", funcionarioId: "f-marcos", tipo: "atestado", inicio: d(proximaSexta), fim: d(proximaSexta), restricoes: [], nota: "Avisou por mensagem às 8h.", criadoEm: criado },
    { id: "oc-2", funcionarioId: "s-camila", tipo: "falta", inicio: d(ultimoSabado), fim: d(ultimoSabado), restricoes: [], criadoEm: criado },
    { id: "oc-3", funcionarioId: "f-juliana", tipo: "ferias", inicio: d(segundaQueVem + 7), fim: d(segundaQueVem + 16), restricoes: [], criadoEm: criado },
    { id: "oc-4", funcionarioId: "b-gabriel", tipo: "afastamento", inicio: d(h - 2), fim: d(h + 4), restricoes: [], criadoEm: criado },
    { id: "oc-5", funcionarioId: "o-sergio", tipo: "restricao", inicio: d(h - 3), fim: d(h + 10), restricoes: ["sem_escala_longa"], criadoEm: criado },
  ].sort((a, b) => b.inicio.localeCompare(a.inicio)) as OcorrenciaRegistro[];

  const regras: RegrasEscala = {
    intervaloDomingoSemanas: 3,
    coberturaMinima: {
      "cozinha:Cozinheiro": 2,
      "cozinha:Auxiliar de cozinha": 1,
      "salao:Garçom": 1,
      "bar:Bartender": 1,
    },
  };

  return { pessoas, ocorrencias, regras };
}
