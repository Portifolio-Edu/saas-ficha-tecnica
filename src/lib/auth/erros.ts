// CONFIGURAÇÕES (2026-10-01): tradução dos erros do Supabase Auth fora do
// arquivo "use server" (lá só pode exportar ação), pra a tela Configurações
// (trocar senha e e-mail) usar a mesma tradução do login.

export function traduzirErroAuth(mensagem: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials": "Usuário, e-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 8 caracteres.",
    "New password should be different from the old password.": "A nova senha precisa ser diferente da anterior.",
    "Email rate limit exceeded": "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.",
    "email rate limit exceeded": "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.",
    // CONFIGURAÇÕES (2026-10-01): troca de e-mail.
    "A user with this email address has already been registered": "Esse e-mail já é de outra conta.",
    "Unable to validate email address: invalid format": "E-mail inválido.",
  };
  return mapa[mensagem] ?? mensagem;
}
