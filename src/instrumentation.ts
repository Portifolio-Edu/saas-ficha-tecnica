// PLANO 9,5, etapa 3 (2026-09-28): todo erro do servidor (página, server
// action, rota) é gravado em erros_sistema — ver src/lib/monitoramento.
import type { Instrumentation } from "next";

export async function register() {}

export const onRequestError: Instrumentation.onRequestError = async (erro, requisicao) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registrarErro } = await import("@/lib/monitoramento");
  await registrarErro({
    origem: "servidor",
    erro,
    rota: requisicao.path,
    metodo: requisicao.method,
    digest: (erro as { digest?: string }).digest ?? null,
  });
};
