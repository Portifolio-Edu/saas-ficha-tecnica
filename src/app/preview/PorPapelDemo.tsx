"use client";

// EQUIPE (2026-09-25): telas da demo que mudam com o "Ver como". O app faz a
// mesma escolha no servidor (src/app/cmv/page.tsx, insumos, estoque).

import type { ComponentProps } from "react";
import { usePapelDemo } from "@/components/ficha/PapelDemo";
import { CmvClient } from "@/app/cmv/CmvClient";
import { InsumosClient } from "@/app/insumos/InsumosClient";
import { EstoqueClient } from "@/app/estoque/EstoqueClient";
import { CmvEstoqueView } from "@/components/cmv/CmvEstoqueView";
import { ehGestao } from "@/lib/auth/papeis";
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
  return <EstoqueClient {...props} contagens={ehGestao(papel) ? contagensDemo : []} />;
}
