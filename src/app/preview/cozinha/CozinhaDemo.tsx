"use client";

// EQUIPE (2026-09-25): modo cozinha na demo. Mesmos componentes do aparelho
// pareado de verdade.
// DEMO (2026-09-25): as ações gravam no "banco" da demo (acoesDemo.ts) e a
// tela lê de lá, então o que a cozinha registra aparece em Produções,
// Estoque, Checklists e Segurança alimentar — e o que o gestor marca aparece
// aqui. Antes as ações só respondiam "ok" e nada chegava ao painel.

import Link from "next/link";
import { useMemo, type ComponentProps } from "react";
import { CozinhaApp } from "@/components/cozinha/CozinhaApp";
import { CHAVES_DEMO, useDemo } from "@/lib/demo/armazem";
import type { Producao } from "@/lib/dominio/producao";
import type { Checklist } from "@/lib/dominio/checklist";
import type { RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { LoteProteinaCozinha, ProducaoCozinha, ProteinaCozinha } from "@/lib/dominio/cozinha";
import type { Processamento } from "@/lib/dominio/processamento";
import { acoesCozinhaDemo } from "./acoesDemo";
import { checklists as checklistsFixture, processamentos as processamentosFixture, producoes as producoesFixture, proteinas as proteinasFixture, registrosTemperatura } from "../fixtures";

type Props = Omit<ComponentProps<typeof CozinhaApp>, "acoes" | "rodape" | "producoes" | "checklists" | "temperaturas" | "proteinas" | "lotesProteina">;

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
  const temperaturasRecentes = useMemo(() => [...temperaturas].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)), [temperaturas]);

  return (
    <CozinhaApp
      {...props}
      producoes={producoesDeHoje}
      checklists={checklists}
      temperaturas={temperaturasRecentes}
      proteinas={proteinasDemo}
      lotesProteina={lotesProteina}
      acoes={acoesCozinhaDemo}
      rodape={
        <>
          Demonstração: o que você registra aqui aparece no painel do gestor (Produções, Estoque, Checklists, Segurança alimentar e Proteínas), só neste
          navegador.{" "}
          <Link href="/preview/producoes" className="underline underline-offset-2">Abrir o painel</Link>
        </>
      }
    />
  );
}
