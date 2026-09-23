# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the chef or cook, on a tablet at the kitchen bench. Their hands are
busy and they read the screen from a distance, in the middle of service, so
they need to understand fast what to produce, what is missing and what went
wrong (production, checklists, stock, losses).

Also: the owner or manager, who registers technical sheets and closes the
monthly CMV. (Confirmed by the user on 2026-09-22.)

## Product Purpose

Ficha Técnica covers the restaurant's whole operation in one place, bringing
predictability and control. Precise technical sheets feed costing, production,
stock and the monthly CMV close, so the operation shows what should happen and
what actually happened.

## Positioning

Confirmado pelo usuário em 2026-09-22.

**O "cérebro" de gestão e inteligência de custos, acima dos PDVs.** Não compete
com PDV: todo PDV básico já baixa estoque por ficha simples. O Ficha Técnica é
a camada especializada em gestão de custos avançada, engenharia de cardápio e
inteligência de CMV, e consome os dados consolidados de fora. Entrega ao dono o
que o caixa tradicional não mostra: **onde exatamente o lucro está vazando na
cozinha.**

- CMV teórico vs real e o gap entre eles.
- Ficha técnica precisa (FC medido por lote, sub-receitas) e produção de
  pré-preparo que os PDVs genéricos não cobrem.
- A cozinha inteira num lugar só, simples pra restaurante pequeno.

## Roadmap de produto (planejado, AINDA NÃO EXISTE no app)

Não mostrar como funcionalidade pronta nem inventar números destes módulos.

1. **Importação de XML de NF-e de compra:** entrada da nota do fornecedor,
   atualiza o custo real dos insumos (que oscila toda semana) e recalcula o
   CMV real.
2. **Planejamento de produção por demanda:** quanto porcionar e quanto fazer de
   base a partir da previsão de vendas.
3. **Vendas em tempo real via iFood (Open Delivery / webhooks):** o pedido
   baixa a ficha e calcula o CMV na hora, sem depender do PDV do balcão.
4. **TOTVS (linha Chef), para redes e médio/grande porte:** parceria de
   integração via API homologada para puxar vendas e devolver ajustes de
   custo e estoque.

Hoje o app importa vendas no fechamento de CMV (colar texto) e, desde
2026-09-23, pela tela **Integrações**: XML das notas de venda (NFC-e/SAT) ou
planilha CSV do PDV, com cada produto do PDV ligado a uma ficha. Isso é real e
funciona com qualquer PDV, mesmo os que não liberam integração.

**Integrações por API com PDV e iFood ainda não existem.** Escolha do usuário
(2026-09-23): no app aparecem "Em breve"; na demo `/preview`, iFood e Saipos
aparecem conectados, com pedidos chegando, **sempre com o selo "demo"** (mesma
regra do agente IA). Lista de PDVs: Saipos, Consumer, Goomer, Anota AI,
Colibri, TOTVS Chef, Stone, Cielo, PagSeguro, Linx Degust e Menew.

**Ordem combinada com o usuário (2026-09-22):** primeiro alinhar todo o
frontend na demo; depois o backend, com **Supabase** (dados, auth, storage) e
**n8n** como a camada de acesso aos agentes de IA do SaaS (o agente IA de hoje
é só simulação em `/preview`).

## Operating Context

- Tablet at the bench during prep and service; a computer for back-office
  work (sheets, CMV close, reports).
- Production is tracked as batches on a kanban: in stock (can be produced),
  in production, produced, loss (loss requires a reason).
- Turn checklists (opening, closing) with the person responsible and the shift
  lead.
- The monthly CMV close imports sales and compares theoretical vs real.

## Capabilities and Constraints

- Next.js 15 + Supabase (multi-tenant via RLS), Brazilian Portuguese, BRL
  currency, pt-BR formatting (decimal comma).
- Current phase: public demo at `/preview/*` with fixtures
  ("Cantina Bella Notte"); everything is developed before connecting the real
  database.
- The AI agent (images, audio, WhatsApp) is a simulated demonstration: it
  exists only in `/preview` and must stay labeled as a demo until the real
  integration exists.
- Calculation engine in `src/lib/calculo` (pure functions, with tests): FC,
  unit conversion, CMV, pricing, production capacity, CMV close, nutrition.

## Brand Commitments

- **Padrão premium de SaaS, feito sem ironia** (escolha do usuário em
  2026-09-22). A régua de acabamento: Stripe (painel), Linear e Toast/Square.
  Ou seja, o refinamento e os números impecáveis do Stripe, a densidade e o modo
  escuro do Linear e os alvos grandes de tablet dos sistemas de restaurante.
- É uma ferramenta premium: o visual pesa na venda do SaaS pro dono do restaurante.

## Evidence on Hand

- Demo fixtures in `src/app/preview/fixtures.ts`.
- No real customers, testimonials or metrics yet: do not fabricate any.

## Product Principles

1. Legible at a distance, fast in the middle of service: the number that
   matters comes first.
2. Never make up a number: everything on screen comes from the sheet, from
   stock or from a real record.
3. Nothing important gets hidden: losses, gaps and risks show up without
   anyone having to go looking for them.
4. One single system: the same term, the same color and the same component
   mean the same thing on every screen.

## Accessibility & Inclusion

- Use at a distance on a tablet: large text for the key numbers, touch
  targets of at least 44px, high contrast in both themes.
- pt-BR in every number and date.
