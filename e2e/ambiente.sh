#!/usr/bin/env bash
# PLANO 9,5 (2026-09-26): variáveis do app apontando pro Supabase LOCAL
# (`supabase start`). As chaves são as de desenvolvimento local, geradas pelo
# próprio CLI; nada de produção passa por aqui.
# Uso: source e2e/ambiente.sh
if command -v supabase >/dev/null 2>&1; then SUPA=supabase; else SUPA="npx --yes supabase"; fi
eval "$($SUPA status -o env 2>/dev/null)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000"
export E2E_MAILPIT_URL="$MAILPIT_URL"
export E2E_DB_URL="$DB_URL"
# AGENTE IA (2026-09-26): valores SÓ de teste. O n8n é simulado pelo próprio
# teste (e2e/agente.spec.ts sobe um servidor na porta 3999).
export AGENTE_SEGREDO="segredo-de-teste-local-com-mais-de-32-caracteres"
export AGENTE_CHAVE_N8N="chave-n8n-de-teste-local-com-mais-de-32-caracteres"
export AGENTE_N8N_URL="http://127.0.0.1:3999/agente"
export AGENTE_WHATSAPP_NUMERO="5511900000000"
