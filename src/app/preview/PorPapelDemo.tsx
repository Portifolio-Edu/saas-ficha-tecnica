"use client";

// EQUIPE (2026-09-25): telas da demo que mudam com o "Ver como". O app faz a
// mesma escolha no servidor (src/app/cmv/page.tsx, insumos, estoque).
// DEMO (2026-09-25): e telas que leem o "banco" da demo
// (src/lib/demo/armazem.ts), pra o que a cozinha registra aparecer no painel:
// temperaturas (Segurança, Relatórios), produções e perdas (Relatórios, Visão
// geral) e contagens cegas (Estoque). Produções e Estoque já liam direto.
// O `key={versao}` remonta a tela quando o dado muda, porque algumas só leem
// as props na montagem.

import type { ComponentProps } from "react";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import { CmvClient } from "@/app/cmv/CmvClient";
import { InsumosClient } from "@/app/insumos/InsumosClient";
import { EstoqueClient } from "@/app/estoque/EstoqueClient";
import { SegurancaClient } from "@/app/seguranca/SegurancaClient";
import { RelatoriosClient } from "@/app/relatorios/RelatoriosClient";
import { VisaoGeralClient } from "@/app/visao-geral/VisaoGeralClient";
import { ProteinasClient } from "@/app/proteinas/ProteinasClient";
import type { Processamento } from "@/lib/dominio/processamento";
import { CmvEstoqueView } from "@/components/cmv/CmvEstoqueView";
import { ehGestao } from "@/lib/auth/papeis";
import { CHAVES_DEMO, useDemo } from "@/lib/demo/armazem";
import type { ContagemCega } from "@/lib/dominio/estoque";
import type { Producao } from "@/lib/dominio/producao";
import type { RegistroTemperatura } from "@/lib/dominio/temperatura";
import { contagensDemo, fechamentosEstoqueDemo } from "./equipeDemo";

export function CmvDemo(props: ComponentProps<typeof CmvClient>) {
  const { papel } = usePapelDemo();
  return papel === "estoquista" ? <CmvEstoqueView fechamentos={fechamentosEstoqueDemo} /> : <CmvClient {...props} />;
}

export function InsumosDemo(props: ComponentProps<typeof InsumosClient>) {
  const { papel } = usePapelDemo();
  return <InsumosClient {...props} mostrarPreparos={papel !== "estoquista"} />;
}

export function EstoqueDemo(props: ComponentProps<typeof EstoqueClient>) {
  const { papel } = usePapelDemo();
  const [contagens, versao] = useDemo<ContagemCega>(CHAVES_DEMO.contagens, contagensDemo);
  return <EstoqueClient key={versao} {...props} contagens={ehGestao(papel) ? contagens : []} />;
}

export function SegurancaDemo(props: ComponentProps<typeof SegurancaClient>) {
  const [registros, versao] = useDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, props.registros);
  return <SegurancaClient key={versao} {...props} registros={registros} />;
}

export function RelatoriosDemo(props: ComponentProps<typeof RelatoriosClient>) {
  const [producoes, vP] = useDemo<Producao>(CHAVES_DEMO.producoes, props.producoes);
  const [registros, vT] = useDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, props.registrosTemperatura);
  return <RelatoriosClient key={`${vP}-${vT}`} {...props} producoes={producoes} registrosTemperatura={registros} />;
}

export function VisaoGeralDemo(props: ComponentProps<typeof VisaoGeralClient>) {
  const [producoes, versao] = useDemo<Producao>(CHAVES_DEMO.producoes, props.producoes);
  return <VisaoGeralClient key={versao} {...props} producoes={producoes} />;
}

// PROTEÍNAS (2026-09-25): lotes que o tablet registra aparecem aqui.
export function ProteinasDemo(props: ComponentProps<typeof ProteinasClient>) {
  const [processamentos, versao] = useDemo<Processamento>(CHAVES_DEMO.processamentos, props.processamentos);
  return <ProteinasClient key={versao} {...props} processamentos={processamentos} />;
}
