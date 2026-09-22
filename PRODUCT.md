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

- It covers the whole operation: predictability and control over everything,
  not a single loose spreadsheet.
- Real vs theoretical CMV: the gap between what the sheets predict and what
  left stock.
- Precise technical sheet: correction factor measured per batch, nested
  sub-recipes, exact cost per portion.
- The whole kitchen in one place: production (kanban), stock, turn checklists,
  food safety and nutrition, integrated.
- Simple for a small restaurant, for teams without a controller or a
  nutritionist.

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
