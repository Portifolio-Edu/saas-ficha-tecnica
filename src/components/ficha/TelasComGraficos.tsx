"use client";

// DESEMPENHO (2026-10-03): as telas do app que usam gráficos (Recharts) entram
// por import dinâmico, como já era na demo (src/app/preview/PorPapelDemo.tsx).
// Continuam renderizando no servidor; o que muda é que o código dos gráficos
// sai do primeiro carregamento. Antes (next build): /proteinas e
// /seguranca 330 kB de First Load JS. O /cmv fica pra depois do merge com o
// back (src/app/cmv/page.tsx é dele agora); a demo já carrega sob demanda.

import dynamic from "next/dynamic";
import { EsqueletoTela } from "./Skeleton";

export const ProteinasClient = dynamic(() => import("@/app/proteinas/ProteinasClient").then((m) => m.ProteinasClient), { loading: () => <EsqueletoTela /> });
export const SegurancaClient = dynamic(() => import("@/app/seguranca/SegurancaClient").then((m) => m.SegurancaClient), { loading: () => <EsqueletoTela /> });
