// PLANO 9,5, etapa 3 (2026-09-26): monta a linha de erro que vai pro banco
// (erros_sistema). Puro, sem dependência de servidor, pra dar pra testar.
// Corta nos limites da tabela e tira do texto o que não pode ficar guardado:
// tokens (JWT, chave de API), e-mails e números longos (telefone, documento).

export type RegistroErro = {
  origem: "servidor" | "navegador";
  rota: string | null;
  metodo: string | null;
  digest: string | null;
  mensagem: string;
  detalhe: string | null;
  user_id: string | null;
  cliente_id: string | null;
  ambiente: string | null;
};

export function limparTexto(texto: string): string {
  return texto
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "[token]")
    .replace(/\b(sk|pk|sb|rk)_[a-z]*_?[A-Za-z0-9]{16,}\b/g, "[chave]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b\d{8,}\b/g, "[número]");
}

function cortar(texto: string | null | undefined, limite: number): string | null {
  if (!texto) return null;
  const limpo = limparTexto(texto);
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

/** Só o caminho (sem ?busca): a busca pode ter token de link de e-mail. */
export function rotaSemBusca(rota: string | null | undefined): string | null {
  if (!rota) return null;
  try {
    return new URL(rota, "http://x").pathname.slice(0, 300);
  } catch {
    return rota.split("?")[0].slice(0, 300);
  }
}

export function montarRegistro(entrada: {
  origem: RegistroErro["origem"];
  erro: unknown;
  rota?: string | null;
  metodo?: string | null;
  digest?: string | null;
  userId?: string | null;
  clienteId?: string | null;
  ambiente?: string | null;
}): RegistroErro {
  const e = entrada.erro;
  const mensagem = e instanceof Error ? e.message : typeof e === "string" ? e : "Erro sem mensagem";
  const detalhe = e instanceof Error ? e.stack ?? null : null;
  const digest = entrada.digest ?? (e && typeof e === "object" && "digest" in e ? String((e as { digest: unknown }).digest) : null);
  return {
    origem: entrada.origem,
    rota: rotaSemBusca(entrada.rota),
    metodo: entrada.metodo ? entrada.metodo.slice(0, 10) : null,
    digest: digest ? digest.slice(0, 100) : null,
    mensagem: cortar(mensagem, 1000) || "Erro sem mensagem",
    detalhe: cortar(detalhe, 8000),
    user_id: entrada.userId ?? null,
    cliente_id: entrada.clienteId ?? null,
    ambiente: entrada.ambiente ? entrada.ambiente.slice(0, 40) : null,
  };
}
