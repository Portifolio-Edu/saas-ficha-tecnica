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
// DESEMPENHO (2026-10-03): `loading` com esqueleto. Sem ele a área ficava vazia
// enquanto o código da tela chegava (QA: /preview/cmv, 1s em branco em CPU 4x).

const CmvClient = dynamic(() => import("@/app/cmv/CmvClient").then((m) => m.CmvClient), { loading: () => <EsqueletoTela /> });
const CmvEstoqueView = dynamic(() => import("@/components/cmv/CmvEstoqueView").then((m) => m.CmvEstoqueView), { loading: () => <EsqueletoTela /> });
const InsumosClient = dynamic(() => import("@/app/insumos/InsumosClient").then((m) => m.InsumosClient), { loading: () => <EsqueletoTela /> });
const EstoqueClient = dynamic(() => import("@/app/estoque/EstoqueClient").then((m) => m.EstoqueClient), { loading: () => <EsqueletoTela /> });
const ComprasClient = dynamic(() => import("@/app/estoque/compras/ComprasClient").then(m => m.ComprasClient), { loading: () => <EsqueletoTela /> });
const SegurancaClient = dynamic(() => import("@/app/seguranca/SegurancaClient").then((m) => m.SegurancaClient), { loading: () => <EsqueletoTela /> });
const RelatoriosClient = dynamic(() => import("@/app/relatorios/RelatoriosClient").then((m) => m.RelatoriosClient), { loading: () => <EsqueletoTela /> });
const VisaoGeralClient = dynamic(() => import("@/app/visao-geral/VisaoGeralClient").then((m) => m.VisaoGeralClient), { loading: () => <EsqueletoTela /> });
const ProteinasClient = dynamic(() => import("@/app/proteinas/ProteinasClient").then((m) => m.ProteinasClient), { loading: () => <EsqueletoTela /> });

import { useEffect, useState, type ComponentProps } from "react";
import { EVENTO_MARCA_DEMO, permissaoComprasDemo } from "@/components/configuracoes/demo";
import dynamic from "next/dynamic";
import { EsqueletoTela } from "@/components/ficha/Skeleton";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import type { CmvClient as TCmvClient } from "@/app/cmv/CmvClient";
import type { InsumosClient as TInsumosClient } from "@/app/insumos/InsumosClient";
import type { ComprasClient as TComprasClient } from "@/app/estoque/compras/ComprasClient";
import type { EstoqueClient as TEstoqueClient } from "@/app/estoque/EstoqueClient";
import type { SegurancaClient as TSegurancaClient } from "@/app/seguranca/SegurancaClient";
import type { RelatoriosClient as TRelatoriosClient } from "@/app/relatorios/RelatoriosClient";
import type { VisaoGeralClient as TVisaoGeralClient } from "@/app/visao-geral/VisaoGeralClient";
import type { ProteinasClient as TProteinasClient } from "@/app/proteinas/ProteinasClient";
import type { Processamento } from "@/lib/dominio/processamento";
import { ehGestao } from "@/lib/auth/papeis";
import { CHAVES_DEMO, gravarDemo, lerDemo, useDemo } from "@/lib/demo/armazem";
import { podeResolverRequisicao, type NovaRequisicao, type Requisicao, type StatusRequisicao } from "@/lib/dominio/requisicao";
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
  return (
    <EstoqueClient
      key={`${versao}-${versaoPedidos}`}
      {...props}
      contagens={ehGestao(papel) ? contagens : []}
      requisicoes={requisicoes}
    />
  );
}

export function ComprasDemo(props: Pick<ComponentProps<typeof TComprasClient>, "insumos" | "fornecedores">) {
  const { papel } = usePapelDemo();
  const [requisicoes] = useDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
  const [estoquePermitido, setEstoquePermitido] = useState(false);
  useEffect(() => {
    const carregar = () => setEstoquePermitido(permissaoComprasDemo());
    carregar(); window.addEventListener(EVENTO_MARCA_DEMO, carregar); window.addEventListener("storage", carregar);
    return () => { window.removeEventListener(EVENTO_MARCA_DEMO, carregar); window.removeEventListener("storage", carregar); };
  }, []);
  const resolver = async (ids: string[], status: StatusRequisicao) => {
    const atuais = lerDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
    const selecionadas = atuais.filter(r => ids.includes(r.id));
    if (selecionadas.length !== ids.length || selecionadas.some(r => !podeResolverRequisicao(papel, r.status, status, permissaoComprasDemo()))) return { ok: false as const, erro: "A decisão exige uma pessoa autorizada nas configurações de Compras." };
    const agora = new Date().toISOString();
    gravarDemo(CHAVES_DEMO.requisicoes, atuais.map(r => !ids.includes(r.id) ? r : { ...r, status, ...(status === "aprovado" ? { aprovadoEm: agora, aprovadoPor: `demo-${papel}`, aprovadoNome: papel === "dono" ? "Dono (demonstração)" : papel === "gestor" ? "Gestor (demonstração)" : "Estoque (demonstração)" } : { resolvidoEm: agora, resolvidoNome: `${papel} (demonstração)` }) }));
    return { ok: true as const };
  };
  const solicitar = async (r: NovaRequisicao) => {
    if (papel === "cozinha") return { ok: false as const, erro: "Solicite pelo aparelho da cozinha." };
    const atuais = lerDemo<Requisicao>(CHAVES_DEMO.requisicoes, requisicoesDemo);
    gravarDemo(CHAVES_DEMO.requisicoes, [{ ...r, id: crypto.randomUUID(), status: "pendente", responsavel: `${papel} (demonstração)`, criadoEm: new Date().toISOString(), resolvidoEm: null }, ...atuais]);
    return { ok: true as const };
  };
  return <ComprasClient {...props} estoquePermitido={estoquePermitido} papel={papel} requisicoes={requisicoes} nomeRestaurante={NOME_RESTAURANTE} resolver={resolver} solicitar={solicitar} />;
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
