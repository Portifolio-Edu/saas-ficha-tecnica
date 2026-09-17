"use client";

import { useState } from "react";

export interface ResultadoAcao {
  ok: boolean;
  erro?: string;
}

/**
 * Padrão erro/salvando/try-finally repetido em todo XForm do sistema: marca
 * salvando, limpa o erro anterior, roda a server action e mostra o erro se
 * ela vier com ok:false -- sempre voltando salvando pra false no final,
 * mesmo se a action lançar.
 */
export function useAcaoFormulario(onSucesso: () => void) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executar = async (acao: () => Promise<ResultadoAcao>) => {
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await acao();
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Erro desconhecido.");
        return;
      }
      onSucesso();
    } finally {
      setSalvando(false);
    }
  };

  return { salvando, erro, executar, setErro };
}
