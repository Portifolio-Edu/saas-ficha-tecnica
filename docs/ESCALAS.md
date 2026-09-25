# Módulo de escalas e contingência

Fase 1 (2026-09-26): modelagem de dados e motor matemático. Sem tela ainda.

## O que existe

- Motor puro: `src/lib/escalas/` (`gerarEscala`, `folgasDaSemana`). Testes em
  `src/lib/escalas/__tests__/motor.test.ts` (15).
- Proposta de banco: `supabase/propostas/20260926100000_escalas.sql`
  (**não aplicada**; testada numa transação desfeita). Reverter no mesmo lugar.

## Regras implementadas (ordem de força)

1. Contrato: fora de admissão/desligamento não há escala.
2. Lei: no máximo 6 dias seguidos; se passar, folga compensatória seg–qui.
3. Sexta e sábado protegidos (5x2 e 6x1): folga ali vira trabalho e vai pro
   seg–qui mais próximo (quinta antes de segunda no empate).
4. Folga regular só seg–qui; domingo só pelo rodízio.
5. Rodízio de domingo por equipe (setor + cargo): fila por data de admissão,
   1 domingo a cada N semanas, alternando; admissão/desligamento reequilibram.
   5x2: o domingo troca a última folga da semana (continua 5 dias). 6x1: o
   domingo soma (trocar daria mais de 6 dias seguidos).
6. 12x36 e 24x48 não se movem; sexta/sábado vem da cobertura da equipe.
7. Prontuário: falta/atestado em dia de trabalho → contingência com o perfil
   de quem faltou; férias/afastamento tiram a pessoa; restrição
   "sem_escala_longa" troca 12x36/24x48 por 5x2 enquanto durar.
8. Cobertura mínima por equipe/dia; em dia de pico o alerta é crítico.

## Pontos pra validar com o contador / convenção coletiva

- Rodízio de domingo: o briefing pediu 1 a cada 4 semanas. Pra comércio em
  geral a Lei 10.101/2000 (art. 6º, parágrafo único) pede pelo menos 1 a cada
  3 semanas. Padrão ficou 3, configurável por restaurante e por pessoa; acima
  de 3 o motor avisa.
- 12x36 precisa de acordo escrito (CLT art. 59-A); 24x48 normalmente só por
  convenção coletiva.
- Domingo quinzenal pra mulheres (CLT art. 386) tem aplicação discutida; se o
  contador orientar, use o intervalo por pessoa (2 semanas).

## Próximas fases

- Fase 2: gravar/ler do banco + tela (calendário mensal por funcionário,
  painel de alertas, prontuário).
- Fase 3: contingência — casar perfil (cargo, nível ≥, habilidades) com o
  banco de extras e disparar WhatsApp só pra quem consentiu (via n8n/Evolution).
