// ESCALAS (2026-09-26): equipe e prontuário da demonstração (/preview/escalas
// e aba Escala do /preview/cozinha). As datas das ocorrências são relativas a
// hoje, pra demo sempre mostrar algo acontecendo nesta semana e na próxima:
//  - atestado do Marcos na próxima sexta → alerta de contingência (crítico);
//  - falta da Camila no último sábado;
//  - férias da Juliana daqui a duas semanas;
//  - afastamento do Gabriel nesta semana (a cozinha vê só "Ausente");
//  - restrição do Sérgio (apoio, 12x36) → vira 5x2 enquanto durar;
//  - Tânia só com o nome → aviso de cadastro incompleto.
// PERFIL (2026-09-27): prontuário de competências de cada um (nível, praças,
// pontos fortes, limitações), notas e banco de extras. O atestado do Marcos
// (Cozinheiro pleno, grelha + chapa) casa com a Lia (sênior, cobre tudo), o
// Otávio (pleno, só grelha) e a Beatriz (especialista, sem WhatsApp); a
// Renata (júnior) e o Wagner (inativo) ficam de fora.
// Onde mexer: aqui. Os ids f-ana, f-juliana, f-marcos e f-pedro são os mesmos
// do "Quem está usando" do tablet (equipeDemo.ts).
import { diaDaSemana, paraDia, paraISO } from "@/lib/escalas/datas";
import type { OcorrenciaRegistro, PessoaEscala } from "@/lib/escalas/cadastro";
import { PERFIL_VAZIO, type NotaPerfil, type PerfilCompetencia } from "@/lib/escalas/perfil";
import type { Extra } from "@/lib/escalas/extras";
import type { DataISO, DiaSemana, Nivel, RegrasEscala, Setor, TipoEscala } from "@/lib/escalas/tipos";

const perfil = (nivel: Nivel | null, pracas: string[], pontosFortes: string[] = [], limitacoes: string[] = [], observacoes: string | null = null): PerfilCompetencia => ({
  nivel,
  pracas,
  pontosFortes,
  limitacoes,
  observacoes,
  atualizadoEm: null,
});

function pessoa(
  id: string,
  nome: string,
  setor: Setor,
  cargo: string,
  admissao: DataISO,
  tipo: TipoEscala,
  folgas: DiaSemana[],
  turno: [string, string],
  p: PerfilCompetencia,
  ancora: DataISO = "2026-01-05",
): PessoaEscala {
  return {
    id,
    nome,
    setor,
    cargo,
    admissao,
    desligamento: null,
    escala: { tipo, ancora, folgasPreferidas: folgas, turno: { inicio: turno[0], fim: turno[1] } },
    perfil: p,
  };
}

export interface EscalasDemo {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  regras: RegrasEscala;
  notas: NotaPerfil[];
  extras: Extra[];
}

/** Demo gravada antes do prontuário de competências: completa o perfil. */
export function pessoasDemoAtuais(lista: PessoaEscala[], iniciais: PessoaEscala[]): PessoaEscala[] {
  const porId = new Map(iniciais.map((p) => [p.id, p.perfil]));
  return lista.map((p) => {
    if (p.perfil) return p;
    const { nivel: _n, habilidades: _h, ...resto } = p as PessoaEscala & { nivel?: unknown; habilidades?: unknown };
    void _n;
    void _h;
    return { ...resto, perfil: porId.get(p.id) ?? PERFIL_VAZIO };
  });
}

export function escalasDemoIniciais(hoje: DataISO): EscalasDemo {
  const h = paraDia(hoje);
  const dow = diaDaSemana(h);
  const proximaSexta = h + ((5 - dow + 7) % 7);
  const ultimoSabado = h - (((dow - 6 + 7) % 7) || 7);
  const segundaQueVem = h - ((dow + 6) % 7) + 7;
  const d = (n: number) => paraISO(n);
  const criado = `${hoje}T09:00:00.000Z`;

  const pessoas: PessoaEscala[] = [
    pessoa("f-ana", "Ana Souza", "cozinha", "Chef de cozinha", "2023-03-06", "6x1", [1], ["10:00", "18:20"],
      perfil("especialista", ["Cozinha quente", "Molhos e fundos", "Expedição (passe)"], ["Ensina bem", "Padrão de empratamento"])),
    pessoa("f-juliana", "Juliana Costa", "cozinha", "Cozinheiro", "2023-08-14", "6x1", [3], ["10:00", "18:20"],
      perfil("senior", ["Grelha", "Molhos e fundos", "Cozinha quente"], ["Segura a praça sozinho", "Cobre outras praças"])),
    pessoa("f-marcos", "Marcos Silva", "cozinha", "Cozinheiro", "2024-02-01", "6x1", [2], ["14:00", "22:20"],
      perfil("pleno", ["Grelha", "Chapa"], ["Agilidade sob pressão"], ["Esquece etiquetagem"])),
    pessoa("c-lucas", "Lucas Rocha", "cozinha", "Cozinheiro", "2025-05-12", "6x1", [4], ["14:00", "22:20"],
      perfil("junior", ["Fritura", "Chapa"], ["Pontual"], ["Precisa de supervisão no pico", "Não opera sozinho na chapa"], "Chapa só com o Marcos ou a Juliana do lado no jantar de sábado.")),
    pessoa("f-pedro", "Pedro Alves", "cozinha", "Auxiliar de cozinha", "2024-09-02", "5x2", [1, 4], ["08:00", "16:48"],
      perfil("junior", ["Pré-preparo", "Porcionamento"], ["Organizado no mise en place", "Controla desperdício"])),
    pessoa("c-rafaela", "Rafaela Lima", "cozinha", "Auxiliar de cozinha", "2025-01-20", "6x1", [2], ["14:00", "22:20"],
      perfil("junior", ["Pré-preparo", "Confeitaria"], [], ["Ainda não domina as fichas"])),
    pessoa("s-diego", "Diego Martins", "salao", "Maître", "2022-11-07", "5x2", [2, 3], ["11:00", "19:48"],
      perfil("senior", ["Maître", "Vinhos", "Atendimento"], ["Ótimo com clientes", "Ensina bem"])),
    pessoa("s-bruno", "Bruno Tavares", "salao", "Garçom", "2024-04-15", "6x1", [1], ["11:00", "19:20"], perfil("pleno", ["Atendimento", "Vinhos"], ["Ótimo com clientes"])),
    pessoa("s-camila", "Camila Reis", "salao", "Garçom", "2025-03-03", "6x1", [3], ["15:00", "23:20"], perfil("junior", ["Atendimento", "Caixa"], [], ["Dificuldade com horários"])),
    pessoa("b-fernanda", "Fernanda Dias", "bar", "Bartender", "2024-06-10", "6x1", [2], ["16:00", "00:20"], perfil("pleno", ["Coquetelaria", "Drinks clássicos"], ["Agilidade sob pressão"])),
    pessoa("b-thiago", "Thiago Barros", "bar", "Bartender", "2025-02-17", "6x1", [4], ["18:00", "02:20"], perfil("junior", ["Drinks clássicos", "Chope"])),
    pessoa("b-gabriel", "Gabriel Nunes", "bar", "Barback", "2025-07-01", "6x1", [4], ["16:00", "00:20"], perfil(null, ["Chope"])),
    pessoa("o-sergio", "Sérgio Lopes", "outro", "Segurança", "2023-10-02", "12x36", [], ["18:00", "06:00"], perfil("pleno", ["Segurança"], ["Pontual"]), "2026-01-01"),
    { id: "t-tania", nome: "Tânia Freitas", setor: null, cargo: null, admissao: null, desligamento: null, escala: null, perfil: PERFIL_VAZIO },
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

  const autor = "Gestor (demo)";
  const notas: NotaPerfil[] = [
    { id: "nt-1", funcionarioId: "f-marcos", data: d(h - 6), tipo: "elogio", texto: "Segurou a grelha sozinho no sábado de casa cheia.", autor, criadoEm: criado },
    { id: "nt-2", funcionarioId: "f-marcos", data: d(h - 12), tipo: "atencao", texto: "Esqueceu de etiquetar os molhos do turno.", autor, criadoEm: criado },
    { id: "nt-3", funcionarioId: "s-camila", data: d(h - 9), tipo: "pontualidade", texto: "Chegou 40 min atrasada no domingo.", autor, criadoEm: criado },
    { id: "nt-4", funcionarioId: "s-camila", data: d(h - 5), tipo: "atencao", texto: "Faltou no sábado sem avisar antes.", autor, criadoEm: criado },
    { id: "nt-5", funcionarioId: "s-diego", data: d(h - 3), tipo: "elogio", texto: "Cliente da mesa 12 elogiou o atendimento.", autor, criadoEm: criado },
    { id: "nt-6", funcionarioId: "c-lucas", data: d(h - 4), tipo: "postura", texto: "Pediu pra treinar na chapa nos dias calmos.", autor, criadoEm: criado },
  ].sort((a, b) => b.data.localeCompare(a.data)) as NotaPerfil[];

  const consentiu = `${d(h - 40)}T12:00:00.000Z`;
  const extra = (id: string, nome: string, telefone: string, setor: Setor, cargos: string[], nivel: Nivel | null, pracas: string[], whatsapp: boolean, ativo = true, nota: string | null = null): Extra => ({
    id,
    nome,
    telefone,
    setor,
    cargos,
    nivel,
    pracas,
    aceitaWhatsapp: whatsapp,
    consentimentoEm: whatsapp ? consentiu : null,
    ativo,
    nota,
  });
  const extras: Extra[] = [
    extra("ex-lia", "Lia Martins", "5511987650101", "cozinha", ["Cozinheiro"], "senior", ["Grelha", "Chapa", "Fritura"], true),
    extra("ex-otavio", "Otávio Prado", "5511987650102", "cozinha", ["Cozinheiro"], "pleno", ["Grelha"], true, true, "Só pode à noite."),
    extra("ex-beatriz", "Beatriz Rocha", "5511987650103", "cozinha", ["Cozinheiro", "Chef de cozinha"], "especialista", ["Grelha", "Chapa", "Cozinha quente"], false),
    extra("ex-renata", "Renata Alves", "5511987650104", "cozinha", ["Cozinheiro"], "junior", ["Grelha", "Chapa"], true),
    extra("ex-caio", "Caio Mendes", "5511987650105", "cozinha", ["Confeiteiro"], "pleno", ["Confeitaria", "Panificação"], true),
    extra("ex-paulo", "Paulo Nery", "5511987650106", "cozinha", ["Auxiliar de cozinha"], "junior", ["Pré-preparo", "Porcionamento"], true),
    extra("ex-wagner", "Wagner Luz", "5511987650107", "cozinha", ["Cozinheiro"], "senior", ["Grelha", "Chapa"], true, false, "Mudou de cidade."),
    extra("ex-sandra", "Sandra Moura", "5511987650108", "salao", ["Garçom"], "pleno", ["Atendimento", "Vinhos"], true),
    extra("ex-igor", "Igor Sales", "5511987650109", "bar", ["Bartender"], "senior", ["Coquetelaria", "Drinks clássicos"], true),
  ];

  return { pessoas, ocorrencias, regras, notas, extras };
}
