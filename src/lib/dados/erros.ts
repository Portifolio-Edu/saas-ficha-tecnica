interface ErroPostgrest {
  code?: string;
  message: string;
}

/** Traduz os erros de banco mais comuns pra algo que a pessoa que cadastrou entende. */
export function mensagemErro(error: ErroPostgrest): string {
  if (error.code === "23503") {
    return "Não é possível excluir: este item está sendo usado em outra receita ou registro.";
  }
  if (error.code === "23505") {
    return "Já existe um registro com esse valor (verifique nome ou telefone duplicado).";
  }
  if (error.code === "23514") {
    return "Os valores informados não passam nas regras de validação (confira os números).";
  }
  return error.message;
}
