"use client";

// EQUIPE (2026-09-25): modo cozinha na demo. Mesmos componentes do aparelho
// pareado de verdade.
// DEMO (2026-09-25): as ações gravam no "banco" da demo (acoesDemo.ts) e a
// tela lê de lá, então o que a cozinha registra aparece em Produções,
// Estoque, Checklists e Segurança alimentar — e o que o gestor marca aparece
// aqui. Antes as ações só respondiam "ok" e nada chegava ao painel.

import Link from "next/link";
import { useMemo, useState, type ComponentProps } from "react";
import { CozinhaApp } from "@/components/cozinha/CozinhaApp";
import { CHAVES_DEMO, useDemo } from "@/lib/demo/armazem";
import type { Producao } from "@/lib/dominio/producao";
import type { Checklist } from "@/lib/dominio/checklist";
import type { RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { LoteProteinaCozinha, ProducaoCozinha, ProteinaCozinha } from "@/lib/dominio/cozinha";
import type { Processamento } from "@/lib/dominio/processamento";
import { acoesCozinhaDemo } from "./acoesDemo";
import { paraVisao, planoDemoInicial, type ItemPlanoDemo } from "@/lib/demo/planoProducao";
import { escalasDemoIniciais, pessoasDemoAtuais } from "@/lib/demo/escalas";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import { montarEscalaPublica, periodoCozinha, recortePublico } from "@/lib/escalas/publica";
import type { RegrasEscala } from "@/lib/escalas/tipos";
import { checklists as checklistsFixture, fornecedores as fornecedoresFixture, insumos as insumosFixture, processamentos as processamentosFixture, producoes as producoesFixture, proteinas as proteinasFixture, registrosTemperatura, requisicoesDemo, todasReceitas } from "../fixtures";
import { agendaDoFornecedor } from "@/lib/dominio/fornecedor";
import { categoriaDoInsumo, type Requisicao } from "@/lib/dominio/requisicao";

type Props = Omit<ComponentProps<typeof CozinhaApp>, "acoes" | "rodape" | "plano" | "producoes" | "checklists" | "temperaturas" | "proteinas" | "lotesProteina" | "escala" | "hoje" | "requisicoes" | "agendaFornecedores" | "sugestoesPedido">;

// PEDIDOS DA COZINHA (2026-09-26): agenda dos fornecedores da demo (sem contato) e sugestões do cadastro.
const agendaDemo = fornecedoresFixture.map(agendaDoFornecedor).filter((a) => a.diasEntrega.length > 0);
const sugestoesDemo = insumosFixture.map((i) => ({ id: i.id, nome: i.nome, categoria: categoriaDoInsumo(i.categoria) }));

// PROTEÍNAS (2026-09-25): proteínas do cadastro da demo, sem preço.
const proteinasDemo: ProteinaCozinha[] = proteinasFixture.map((p) => ({ id: p.id, nome: p.nome, fatorPadrao: p.fatorCorrecao }));

function deHoje(iso: string): boolean {
  const d = new Date(iso);
  const hoje = new Date();
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
}

export function CozinhaDemo(props: Props) {
  const [producoes] = useDemo<Producao>(CHAVES_DEMO.producoes, producoesFixture);
  const [checklists] = useDemo<Checklist>(CHAVES_DEMO.checklists, checklistsFixture);
  const [temperaturas] = useDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, registrosTemperatura);

  const producoesDeHoje = useMemo<ProducaoCozinha[]>(
    () =>
      producoes
        .filter((p) => deHoje(p.criadoEm))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .map((p) => ({
          id: p.id,
          lote: p.lote,
          receitaId: p.receitaId,
          nomeReceita: p.nomeReceita,
          quantidade: p.quantidade,
          unidade: p.unidadeRendimento,
          responsavel: p.responsavel,
          status: p.status,
          motivoPerda: p.motivoPerda,
          criadoEm: p.criadoEm,
        })),
    [producoes],
  );
  const [processamentos] = useDemo<Processamento>(CHAVES_DEMO.processamentos, processamentosFixture);
  const lotesProteina = useMemo<LoteProteinaCozinha[]>(
    () =>
      [...processamentos]
        .sort((a, b) => b.processadoEm.localeCompare(a.processadoEm))
        .map((p) => ({
          id: p.id,
          insumoId: p.insumoId,
          responsavel: p.responsavel,
          pesoBruto: p.pesoBrutoRecebido,
          pesoLimpo: p.pesoLiquidoResultante,
          aparas: p.pesoAparasReaproveitaveis,
          descarte: p.pesoDescartePuro,
          fc: p.fcObservado,
          observacao: p.observacao,
          processadoEm: p.processadoEm,
        })),
    [processamentos],
  );
  // ESCALAS (2026-09-26): mesma escala que o gestor monta em /preview/escalas,
  // passada pelo mesmo recorte da função escala_publica (sem motivo de
  // ausência). "Hoje" é do navegador; não aparece no HTML estático (a tela
  // inicial é "Quem está usando"), então não há diferença na hidratação.
  const [hoje] = useState(() => hojeLocalISO());
  const iniciaisEscala = useMemo(() => escalasDemoIniciais(hoje), [hoje]);
  const padraoRegras = useMemo(() => [iniciaisEscala.regras], [iniciaisEscala]);
  const [pessoasEscala] = useDemo<PessoaEscala>(CHAVES_DEMO.escalaPessoas, iniciaisEscala.pessoas);
  const [ocorrenciasEscala] = useDemo<OcorrenciaRegistro>(CHAVES_DEMO.escalaOcorrencias, iniciaisEscala.ocorrencias);
  const [regrasEscala] = useDemo<RegrasEscala>(CHAVES_DEMO.escalaRegras, padraoRegras);
  const escala = useMemo(() => {
    const { inicio, fim } = periodoCozinha(hoje);
    return montarEscalaPublica(recortePublico(paraMotor(pessoasDemoAtuais(pessoasEscala, iniciaisEscala.pessoas)), ocorrenciasEscala, regrasEscala[0] ?? iniciaisEscala.regras), inicio, fim);
  }, [hoje, pessoasEscala, ocorrenciasEscala, regrasEscala, iniciaisEscala]);

  const [requisicoes] = useDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
  const planoInicial = useMemo(() => planoDemoInicial(hoje, todasReceitas), [hoje]);
  const [planoTodo] = useDemo<ItemPlanoDemo>(CHAVES_DEMO.planoProducao, planoInicial);
  const plano = useMemo(() => paraVisao(planoTodo, hoje, "cozinha"), [planoTodo, hoje]);

  const temperaturasRecentes = useMemo(() => [...temperaturas].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)), [temperaturas]);

  return (
    <CozinhaApp
      {...props}
      producoes={producoesDeHoje}
      checklists={checklists}
      temperaturas={temperaturasRecentes}
      proteinas={proteinasDemo}
      lotesProteina={lotesProteina}
      escala={escala}
      hoje={hoje}
      requisicoes={requisicoes}
      plano={plano}
      agendaFornecedores={agendaDemo}
      sugestoesPedido={sugestoesDemo}
      acoes={acoesCozinhaDemo}
      rodape={
        <>
          Demonstração: o que você registra aqui aparece no painel do gestor (Produções, Estoque e pedidos de compra, Checklists, Segurança alimentar e Proteínas) e a escala segue o que o gestor monta em Escalas, só neste
          navegador.{" "}
          <Link href="/preview/producoes" className="underline underline-offset-2">Abrir o painel</Link>
        </>
      }
    />
  );
}
