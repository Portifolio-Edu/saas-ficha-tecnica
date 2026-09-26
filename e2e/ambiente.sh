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
