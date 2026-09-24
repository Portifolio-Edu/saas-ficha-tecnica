# Checklist de produção — Ficha Técnica

Estado em 2026-09-24. Cada item diz **quem faz**: 🧑 você (painel/conta/decisão) ou
🤖 Claude (código/banco). Marque `[x]` quando concluir.

## Fase 1 — Base pra funcionar de verdade (sem isso o app não roda)

- [x] 🤖 Banco criado no Supabase `xmjmnnjnxvlzydixyzkf`, migrations aplicadas, RLS em tudo (`docs/BANCO.md`).
- [ ] 🧑 **Vercel → variáveis** (projeto `saas-ficha-tecnica`, conta voycompany), Preview + Production:
      `NEXT_PUBLIC_SUPABASE_URL=https://xmjmnnjnxvlzydixyzkf.supabase.co` e
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon do Supabase>`.
      (A conta Vercel conectada aqui é outra; por isso não consigo cadastrar sozinho.)
- [ ] 🧑 **Supabase → Authentication → URL Configuration**: *Site URL* = domínio de produção;
      *Redirect URLs* = domínio de produção + `https://*-voycompany.vercel.app/**` (prévias).
- [ ] 🧑 **E-mail de verdade (SMTP)**: o e-mail padrão do Supabase só entrega pra membros da
      organização e com limite baixo, então cliente novo não recebe a confirmação.
      Criar conta no Resend (grátis até 3.000/mês), verificar o domínio e colocar em
      Supabase → Authentication → SMTP Settings.
- [ ] 🧑 **Supabase → Authentication → Settings**: ligar "Leaked password protection".
- [x] 🤖 Recuperação de senha ("Esqueci minha senha" + tela de nova senha) e rota `/auth/confirmar`, que recebe os links dos e-mails (antes não existia: quem confirmava o e-mail voltava sem sessão).
- [x] 🤖 Tiradas da publicação as telas de conceito da demo (`/preview/concept-*`, `direcao-*`,
      `cmv-creme`, `visao-geral-sintese`) e os componentes sem uso (recuperar: `git show a57efba:<caminho>`).
- [x] 🤖 Termos de uso (`/termos`) e Política de privacidade (`/privacidade`), rascunho LGPD, com aceite
      obrigatório no cadastro (grava data e versão). Senha mínima passou pra 8 caracteres.
- [ ] 🧑 Preencher razão social, CNPJ, endereço, e-mails e foro em `src/lib/legal/empresa.ts`
      (ou me mandar os dados) e passar os dois textos por um advogado.
- [x] 🤖 Teste de isolamento entre restaurantes no banco real: 15 de 15 OK
      (`supabase/testes/isolamento.sql`). Achou e corrigiu um erro de permissão pra visitante.
- [ ] 🤖 Teste de ponta a ponta com login real na prévia da Vercel, **depois** das variáveis
      (o ambiente do Claude não alcança o supabase.co direto) (cadastro → insumo → receita →
      produção → baixa de estoque → fechamento de CMV → foto de praça).

## Fase 2 — Pra vender (cobrança e confiança)

- [ ] 🧑 Plano do Supabase: **Pro (US$ 25/mês)** antes do primeiro cliente pagante. O plano
      grátis pausa o projeto após 7 dias sem uso e não tem backup diário.
- [ ] 🧑 Domínio próprio (ex.: app.fichatecnica.com.br) apontado pra Vercel.
- [ ] 🧑 Conta no **Asaas** (sandbox primeiro), chave de API e preço do(s) plano(s).
- [ ] 🤖 Cobrança com Asaas: teste grátis de N dias → assinatura mensal (Pix, boleto, cartão),
      webhook que atualiza `clientes.status_assinatura`, bloqueio suave quando vence e tela
      "Minha assinatura".
- [ ] 🤖 Guardar no banco a ligação produto do PDV → ficha (hoje fica só no navegador).
- [ ] 🤖 Primeiro acesso guiado (restaurante vazio: por onde começar) e modelos de checklist.
- [ ] 🤖 Monitoramento de erros (Sentry, grátis no início) e página de status simples.

## Fase 3 — Depois do lançamento

- [ ] 🤖 Backend de IA via n8n (agente em produção; hoje só simulado na demo).
- [ ] 🤖 Integrações por API (iFood Open Delivery, PDVs), conforme credenciamento.
- [ ] 🤖 Importar XML de NF-e de compra (custo real dos insumos).

## Colocar no ar (ordem)

1. Fase 1 inteira, testada na prévia da Vercel com o banco real.
2. Mesclar o PR #1 na `main` → a Vercel publica em produção.
3. Fase 2 antes do primeiro cliente pagante.
