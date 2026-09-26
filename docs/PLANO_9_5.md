# Plano 9,5

Ponto de partida (2026-09-25): **7,5**. Meta: **9,5**. Cada etapa só conta
quando o critério de pronto estiver cumprido e verificado — não quando o
código existe. Marcar aqui conforme avança.

| # | Etapa | Quem | Nota ao fim |
|---|---|---|---|
| 1 | Rede de proteção automática | Claude | 7,9 |
| 2 | Ponta a ponta com login real | Claude | 8,5 |
| 3 | Endurecimento (revisão, segurança, acessibilidade, LGPD) e integração na `main` | Claude | 8,8 |
| 4 | Produção no ar | Dono (painéis) + Claude guiando | 9,1 |
| 5 | Fechar o que ainda é demonstração | Claude + credenciais do dono | 9,3 |
| 6 | Restaurante piloto (2 semanas) | Dono + Claude | 9,5+ |

A nota 9,5 depende da etapa 6: sem gente real usando, qualquer nota acima de
9 seria chute.

## 1. Rede de proteção automática

- [x] GitHub Actions em todo push/PR: tipos, lint, testes unitários, build.
- [x] Banco recriado do zero no CI (Supabase local, todas as migrations) — prova
      que o banco é reproduzível, não só o que está no ar.
- [x] Testes SQL (papéis, isolamento, escalas, prontuário, proteínas…)
      rodando sozinhos no CI; qualquer linha "FALHOU" deixa o check vermelho.

**Pronto quando:** o PR mostra os checks verdes e um erro proposital deixa vermelho.

✅ **Concluída em 2026-09-25.** Execução #1 no GitHub: app (tipos, lint, 130
testes, build) e banco (17 migrations do zero + 151/151 testes SQL) verdes.
Erro proposital num teste SQL: o executor saiu com falha (código 1).

## 2. Ponta a ponta com login real

- [x] Supabase local + app de verdade + Playwright, com restaurante de teste
      criado pela própria tela de cadastro (dono), acessos pela tela Equipe
      (gestor, estoquista) e tablet pareado por código (cozinha).
- [x] Fluxos por papel: cadastro/login/recuperar senha; dono cria acessos;
      pareamento do tablet; cozinha registra produção → estoque baixa; estoquista
      bloqueado fora das telas dele; escala, prontuário e extras gravam no banco;
      cozinha vê a escala sem motivo de ausência.
- [x] Os roteiros ficam no repositório (`e2e/`) e rodam no CI (job "Ponta a ponta").

**Pronto quando:** os fluxos críticos de cada papel passam no CI a cada push.

✅ **Concluída em 2026-09-26.** Execução #3 no GitHub: app, banco (157/157
SQL) e ponta a ponta (11/11 fluxos com login real) verdes. Localmente, 4
rodadas seguidas sem falha. Os testes acharam e ajudaram a corrigir 2 bugs
reais (telefone repetido no cadastro; "Link expirado" na recuperação de senha).

## 3. Endurecimento e integração

- [x] Revisão de código e de segurança do PR inteiro; corrigir o que aparecer
      (11 achados, todos corrigidos — `docs/SEGURANCA.md`).
- [x] Alertas do Supabase: funções `auth_*` sem execução pra visitante; revisar
      cada função `security definer`.
- [x] Acessibilidade (axe) e desempenho (Lighthouse) nas telas principais
      (axe: 60 varreduras sem violação séria; Lighthouse 94–100).
- [x] LGPD: exportar e excluir os dados do restaurante (Configurações → Seus dados).
- [x] Erros de produção registrados (monitoramento): tabela `erros_sistema`,
      com o mesmo código que a pessoa vê na tela.
- [ ] PR #1 integrado na `main` (versão 1.0) com tudo verde — pronto, verde e
      mergeável; a integração é do dono (publica em produção na Vercel).

**Pronto quando:** zero achado crítico aberto, PR integrado.

✅ **Código concluído em 2026-09-26** (falta só o dono integrar o PR). Segurança: 11 achados, todos corrigidos
(`docs/SEGURANCA.md`). Acessibilidade: 60 varreduras axe sem violação séria.
Lighthouse 94–100. LGPD: baixar e excluir em Configurações. Erros de produção
em `erros_sistema`. CI: app (140 unitários), banco (192/192 SQL) e ponta a
ponta (79 fluxos) verdes.

## 4. Produção no ar (painéis do dono; passo a passo em `docs/PRODUCAO.md`)

- [ ] Variáveis na Vercel (inclui `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] URLs do site no Supabase Auth; SMTP próprio; proteção contra senha vazada.
- [ ] Dados da empresa nos termos; domínio; plano com backup.

**Pronto quando:** cadastro real no domínio, com e-mail chegando e senha recuperável.

## 5. Fechar o que ainda é demonstração

- [ ] Agente de IA de verdade (n8n): nota fiscal, estoque, ficha.
- [ ] Escalas fase 3: convite automático de extra por WhatsApp (só com autorização).
- [ ] Cobrança (Asaas).

**Pronto quando:** cada um funciona com conta real, com teste.

## 6. Restaurante piloto

- [ ] Um restaurante usando por 2 semanas: fichas, produção, estoque, CMV, escala.
- [ ] Métricas de uso e lista de atritos; rodada de correções.

**Pronto quando:** o restaurante fecha um CMV no sistema e quer continuar usando.
