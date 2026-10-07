// Só informa presença/formato. Não imprime valores nem verifica contas remotas.
// node --env-file=.env.local scripts/verificar-prontidao.mjs [--json]
const env = process.env;
const preenchido = nome => Boolean(env[nome]?.trim()) && !/[\[\]<>]/.test(env[nome]);
const https = nome => { try { const u = new URL(env[nome]); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } };
const email = nome => preenchido(nome) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env[nome]);
const checks = [
  { item: "URL do Supabase", ok: https("NEXT_PUBLIC_SUPABASE_URL") },
  { item: "Chave pública do Supabase", ok: preenchido("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
  { item: "Credencial de servidor do Supabase", ok: preenchido("SUPABASE_SERVICE_ROLE_KEY") },
  { item: "Endereço HTTPS do produto", ok: https("NEXT_PUBLIC_SITE_URL") },
  { item: "Razão social do fornecedor", ok: preenchido("NEXT_PUBLIC_EMPRESA_RAZAO_SOCIAL") },
  { item: "CNPJ do fornecedor informado", ok: /^\d{14}$/.test((env.NEXT_PUBLIC_EMPRESA_CNPJ ?? "").replace(/\D/g,"")) },
  { item: "Endereço do fornecedor", ok: preenchido("NEXT_PUBLIC_EMPRESA_ENDERECO") },
  { item: "Contato do suporte", ok: email("NEXT_PUBLIC_EMPRESA_EMAIL_CONTATO") },
  { item: "Contato de privacidade", ok: email("NEXT_PUBLIC_EMPRESA_EMAIL_PRIVACIDADE") },
  { item: "Cidade/UF do foro informado", ok: preenchido("NEXT_PUBLIC_EMPRESA_FORO") },
];
const cobrancaHabilitada = env.ASAAS_COBRANCA_HABILITADA === "true";
if (cobrancaHabilitada) {
  checks.push(
    { item: "Ambiente Asaas explícito", ok: ["sandbox","producao"].includes(env.ASAAS_AMBIENTE) },
    { item: "Chave Asaas do ambiente", ok: (env.ASAAS_API_KEY ?? "").startsWith(env.ASAAS_AMBIENTE === "producao" ? "$aact_prod_" : "$aact_hmlg_") },
    { item: "Token próprio do webhook", ok: (env.ASAAS_WEBHOOK_TOKEN ?? "").length >= 32 && (env.ASAAS_WEBHOOK_TOKEN ?? "").length <= 255 && !/\s/.test(env.ASAAS_WEBHOOK_TOKEN ?? "") && env.ASAAS_WEBHOOK_TOKEN !== env.ASAAS_API_KEY },
    { item: "Preço mensal inteiro em centavos", ok: /^\d+$/.test(env.ASAAS_PLANO_MENSAL_CENTAVOS ?? "") && Number.isSafeInteger(Number(env.ASAAS_PLANO_MENSAL_CENTAVOS)) && Number(env.ASAAS_PLANO_MENSAL_CENTAVOS) > 0 },
    { item: "Cobrança real fora de prévias", ok: env.ASAAS_AMBIENTE !== "producao" || !env.VERCEL_ENV || env.VERCEL_ENV === "production" },
  );
}
const resultado = {
  escopo: "Presença e formato das configurações locais; não confirma produção pronta.",
  checks,
  cobranca: cobrancaHabilitada ? "Habilitada na configuração; validar ciclo completo no provedor." : "Desligada; assinatura online ainda não disponível.",
  verificarExternamente: ["Migrations aplicadas e testes SQL", "Domínio e redirects de login", "SMTP: confirmação, convite e recuperação", "Pagamento, repetição de webhook, conciliação e cancelamento em sandbox", "Política comercial de teste e acesso", "Integrações n8n publicadas", "Backup e restauração em ambiente separado", "Operação piloto em restaurante real"],
};
if (process.argv.includes("--json")) console.log(JSON.stringify(resultado, null, 2));
else {
  console.log(resultado.escopo);
  for (const c of checks) console.log(`${c.ok ? "OK" : "PENDENTE"}: ${c.item}`);
  console.log(resultado.cobranca);
  for (const item of resultado.verificarExternamente) console.log(`VERIFICAR: ${item}`);
}
if (checks.some(c => !c.ok)) process.exitCode = 1;
