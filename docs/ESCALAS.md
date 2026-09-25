# Módulo de escalas e contingência

- Fase 1 (2026-09-26): modelagem de dados e motor matemático.
- Fase 2 (2026-09-26): banco aplicado, tela Escalas (gestão) e aba Escala no
  tablet da cozinha (só leitura).

## Onde está

| O quê | Onde |
|---|---|
| Motor (puro, roda no servidor, no navegador e nos testes) | `src/lib/escalas/motor.ts` |
| Validação (tela, demo e server actions usam a mesma) | `src/lib/escalas/validacao.ts` |
| Escala da cozinha (recorte sem motivo) | `src/lib/escalas/publica.ts` |
| Leitura/gravação no Supabase | `src/lib/dados/escalas.ts` |
| Server actions (só dono/gestor) | `src/app/escalas/actions.ts` |
| Tela Escalas | `src/app/escalas/page.tsx`, `src/components/escalas/` |
| Aba Escala do tablet | `src/components/cozinha/EscalaCozinha.tsx`, calculada em `src/app/cozinha/page.tsx` |
| Demo | `/preview/escalas`, aba Escala de `/preview/cozinha`, dados em `src/lib/demo/escalas.ts` |
| Banco | `supabase/migrations/20260926100000_escalas.sql`, `…110000_escalas_salvar.sql`, `…120000_escalas_publica_ausencias.sql` |
| Testes | `src/lib/escalas/__tests__/` (40), `supabase/testes/escalas.sql` (24), `supabase/testes/escalas_salvar.sql` (6) |
| Reverter no banco | `supabase/reverter/20260926120000_…` e depois `supabase/reverter/20260926100000_escalas.sql` |

## Regras que não dá pra desligar

1. **Cozinha, salão e bar nunca folgam sexta nem sábado.** Travado em quatro
   camadas: formulário (sex/sáb/dom não clicáveis; 12x36 e 24x48 bloqueados
   nesses setores), validação (tela e servidor), banco (check em
   `folgas_preferidas <@ {1,2,3,4}` + triggers `validar_escala_config` e
   `validar_setor_funcionario`) e motor (`garantirSextaSabado`: se algum dia
   gerar folga ali, a escala não é publicada — a tela mostra "Escala
   bloqueada" e o tablet "em revisão").
2. Folga regular só de segunda a quinta; domingo de folga só pelo rodízio.
3. No máximo 6 dias seguidos de trabalho; se passar, folga compensatória
   seg–qui.
4. **Nunca 3 folgas seguidas** (máximo 2): nenhum regime é 4x3. Quando o
   domingo do rodízio, a folga compensatória ou a troca de regime por
   restrição juntaria 3, a folga regular muda de dia (seg–qui da mesma
   semana), e a semana continua com a mesma quantidade de folgas. Só se
   nenhum dia servir a folga é cancelada, com aviso (não aconteceu em 195 mil
   semanas simuladas). Trava final: `garantirFolgasSeguidas`.
5. 12x36 e 24x48 só pra apoio (segurança, limpeza, manutenção): nos dias
   alternados a folga cairia na sexta/sábado. Cadastro antigo nesse estado é
   calculado como 5x2 com alerta crítico até corrigir.

## Regras configuráveis (aba Regras)

- Rodízio de domingo por equipe (setor + cargo): 1 a cada 2, 3 ou 4 semanas
  (padrão 3; ver ponto legal abaixo). Por pessoa dá pra sobrescrever.
  5x2: o domingo troca a última folga da semana. 6x1: o domingo soma.
- Mínimo de pessoas por equipe e dia: abaixo disso, alerta (crítico em
  sexta/sábado).

## Prontuário

- Falta e atestado em dia de trabalho viram alerta de contingência com o
  perfil de quem faltou (cargo, nível, habilidades) — base da Fase 3.
  Em dia de folga não mudam nada.
- Férias e afastamento cobrem o período todo.
- Restrição "sem 12x36/24x48" troca o regime por 5x2 enquanto durar;
  "sem noturno" avisa se o turno passa das 22h.
- Se duas ocorrências caem no mesmo dia, vale a mais forte, em qualquer
  ordem: afastamento > férias > falta/atestado.
- LGPD: o campo de observação avisa pra não escrever diagnóstico nem CID.

## O que a cozinha vê (e o que não vê)

A cozinha **vê** a escala e **não altera**: não existe botão de edição na aba,
a RLS não deixa o papel cozinha ler nem gravar `escalas_config` e
`prontuario_ocorrencias`, e as server actions recusam quem não é dono/gestor.

A cozinha lê pela função `escala_publica` (máximo 62 dias), que devolve só
nome, setor, cargo, regime e turno; falta e atestado viram `ausencia`,
afastamento vira `ausencia_prolongada` e a restrição só vai quando muda a
escala. Nada de nota, nível, habilidade ou motivo. O cálculo roda no servidor
e só o resultado (Trabalha / Folga / Férias / Ausente) chega ao tablet. Um
teste compara, dia a dia, a escala do gestor com a da cozinha
(`publica.test.ts`).

## Pontos pra validar com o contador / convenção coletiva

- Rodízio de domingo: o briefing pediu 1 a cada 4 semanas. Pra comércio em
  geral a Lei 10.101/2000 (art. 6º, parágrafo único) pede pelo menos 1 a cada
  3 semanas. Padrão ficou 3; 4 fica disponível com aviso.
- 12x36 precisa de acordo escrito (CLT art. 59-A); 24x48 normalmente só por
  convenção coletiva.
- Domingo quinzenal pra mulheres (CLT art. 386) tem aplicação discutida; se o
  contador orientar, use o intervalo por pessoa (2 semanas).

## Próxima fase

- Fase 3: contingência — casar perfil (cargo, nível ≥, habilidades) com o
  banco de extras e disparar WhatsApp só pra quem consentiu (via n8n/Evolution).
