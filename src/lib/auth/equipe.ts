// EQUIPE (2026-09-25): gestor e estoquista entram com usuário e senha
// criados na tela Equipe, sem precisar de e-mail. O Supabase Auth exige um
// e-mail, então cada usuário ganha um e-mail técnico neste domínio, que
// nunca recebe mensagem (a conta é criada já confirmada e a senha é trocada
// pelo gestor, não por "esqueci minha senha"). O aparelho da cozinha usa o
// mesmo domínio com um nome sorteado.
// Onde mexer: DOMINIO_EQUIPE (trocar quebra o login de quem já foi criado).
//
// PLANO 9,5 (2026-09-28): o domínio era "equipe.fichatecnica.app", que não é
// nosso. Quem registrasse esse domínio receberia o link de "esqueci minha
// senha" de qualquer gestor/estoquista (o usuário é fácil de adivinhar) e
// tomaria a conta. ".invalid" é reservado (RFC 6761): ninguém registra e
// nenhum e-mail é entregue. Trocado antes de haver restaurante em produção.
// Reverter: voltar a string (só se o Supabase recusar o domínio; nesse caso,
// usar um subdomínio de um domínio do dono, sem registro MX).

export const DOMINIO_EQUIPE = "equipe.fichatecnica.invalid";

const PADRAO_USUARIO = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** "Maria.Silva " -> "maria.silva". Mesma regra do check em membros.usuario. */
export function normalizarUsuario(bruto: string): string {
  return bruto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".");
}

export function usuarioValido(usuario: string): boolean {
  return PADRAO_USUARIO.test(usuario);
}

export function emailDoUsuario(usuario: string): string {
  return `${usuario}@${DOMINIO_EQUIPE}`;
}

/** O campo do login aceita e-mail (dono) ou usuário (equipe). */
export function emailDeLogin(entrada: string): string {
  const valor = entrada.trim();
  return valor.includes("@") ? valor : emailDoUsuario(normalizarUsuario(valor));
}
