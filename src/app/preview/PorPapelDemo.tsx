"use client";

// EQUIPE (2026-09-25): telas da demo que mudam com o "Ver como". O app faz a
// mesma escolha no servidor (src/app/cmv/page.tsx, insumos, estoque).
// DEMO (2026-09-25): e telas que leem o "banco" da demo
// (src/lib/demo/armazem.ts), pra o que a cozinha registra aparecer no painel:
// temperaturas (Segurança, Relatórios), produções e perdas (Relatórios, Visão
// geral) e contagens cegas (Estoque). Produções e Estoque já liam direto.
// O `key={versao}` remonta a tela quando o dado muda, porque algumas só leem
// as props na montagem.
// PLANO 9,5 (2026-09-26): cada tela entra por import dinâmico (continua
// renderizando no servidor). Antes este arquivo puxava todas as telas pra
// qualquer página da demo — a Visão geral carregava a biblioteca de gráficos
// do CMV (~110 KB) sem usar. Lighthouse: desempenho 86 → ver docs/POLIMENTO §21.

const CmvClient = dynamic(() => import("@/app/cmv/CmvClient").then((m) => m.CmvClient));
const CmvEstoqueView = dynamic(() => import("@/components/cmv/CmvEstoqueView").then((m) => m.CmvEstoqueView));
const InsumosClient = dynamic(() => import("@/app/insumos/InsumosClient").then((m) => m.InsumosClient));
const EstoqueClient = dynamic(() => import("@/app/estoque/EstoqueClient").then((m) => m.EstoqueClient));
const SegurancaClient = dynamic(() => import("@/app/seguranca/SegurancaClient").then((m) => m.SegurancaClient));
const RelatoriosClient = dynamic(() => import("@/app/relatorios/RelatoriosClient").then((m) => m.RelatoriosClient));
const VisaoGeralClient = dynamic(() => import("@/app/visao-geral/VisaoGeralClient").then((m) => m.VisaoGeralClient));
const ProteinasClient = dynamic(() => import("@/app/proteinas/ProteinasClient").then((m) => m.ProteinasClient));

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import type { CmvClient as TCmvClient } from "@/app/cmv/CmvClient";
import type { InsumosClient as TInsumosClient } from "@/app/insumos/InsumosClient";
import type { EstoqueClient as TEstoqueClient } from "@/app/estoque/EstoqueClient";
import type { SegurancaClient as TSegurancaClient } from "@/app/seguranca/SegurancaClient";
import type { RelatoriosClient as TRelatoriosClient } from "@/app/relatorios/RelatoriosClient";
import type { VisaoGeralClient as TVisaoGeralClient } from "@/app/visao-geral/VisaoGeralClient";
import type { ProteinasClient as TProteinasClient } from "@/app/proteinas/ProteinasClient";
import type { Processamento } from "@/lib/dominio/processamento";
import { ehGestao } from "@/lib/auth/papeis";
import { CHAVES_DEMO, gravarDemo, lerDemo, useDemo } from "@/lib/demo/armazem";
import type { Requisicao, StatusRequisicao } from "@/lib/dominio/requisicao";
import { NOME_RESTAURANTE, requisicoesDemo } from "./fixtures";
import type { ContagemCega } from "@/lib/dominio/estoque";
import type { Producao } from "@/lib/dominio/producao";
import type { RegistroTemperatura } from "@/lib/dominio/temperatura";
import { contagensDemo, fechamentosEstoqueDemo } from "./equipeDemo";

export function CmvDemo(props: ComponentProps<typeof TCmvClient>) {
  const { papel } = usePapelDemo();
  return papel === "estoquista" ? <CmvEstoqueView fechamentos={fechamentosEstoqueDemo} /> : <CmvClient {...props} />;
}

export function InsumosDemo(props: ComponentProps<typeof TInsumosClient>) {
  const { papel } = usePapelDemo();
  return <InsumosClient {...props} mostrarPreparos={papel !== "estoquista"} />;
}

export function EstoqueDemo(props: ComponentProps<typeof TEstoqueClient>) {
  const { papel } = usePapelDemo();
  const [contagens, versao] = useDemo<ContagemCega>(CHAVES_DEMO.contagens, contagensDemo);
  // PEDIDOS DA COZINHA (2026-09-26): o que o tablet da demo pediu.
  const [requisicoes, versaoPedidos] = useDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
  const resolverPedidos = async (ids: string[], status: StatusRequisicao) => {
    const agora = new Date().toISOString();
    gravarDemo(CHAVES_DEMO.requisicoes, lerDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo).map((r) => (ids.includes(r.id) ? { ...r, status, resolvidoEm: agora } : r)));
    return { ok: true as const };
  };
  return (
    <EstoqueClient
      key={`${versao}-${versaoPedidos}`}
      {...props}
      contagens={ehGestao(papel) ? contagens : []}
      requisicoes={requisicoes}
      nomeRestaurante={NOME_RESTAURANTE}
      resolverPedidos={resolverPedidos}
    />
  );
}

export function SegurancaDemo(props: ComponentProps<typeof TSegurancaClient>) {
  const [registros, versao] = useDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, props.registros);
  return <SegurancaClient key={versao} {...props} registros={registros} />;
}

export function RelatoriosDemo(props: ComponentProps<typeof TRelatoriosClient>) {
  const [producoes, vP] = useDemo<Producao>(CHAVES_DEMO.producoes, props.producoes);
  const [registros, vT] = useDemo<RegistroTemperatura>(CHAVES_DEMO.temperaturas, props.registrosTemperatura);
  return <RelatoriosClient key={`${vP}-${vT}`} {...props} producoes={producoes} registrosTemperatura={registros} />;
}

export function VisaoGeralDemo(props: ComponentProps<typeof TVisaoGeralClient>) {
  const [producoes, versao] = useDemo<Producao>(CHAVES_DEMO.producoes, props.producoes);
  return <VisaoGeralClient key={versao} {...props} producoes={producoes} />;
}

// PROTEÍNAS (2026-09-25): lotes que o tablet registra aparecem aqui.
export function ProteinasDemo(props: ComponentProps<typeof TProteinasClient>) {
  const [processamentos, versao] = useDemo<Processamento>(CHAVES_DEMO.processamentos, props.processamentos);
  return <ProteinasClient key={versao} {...props} processamentos={processamentos} />;
}
