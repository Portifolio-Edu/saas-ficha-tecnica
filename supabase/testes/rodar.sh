#!/usr/bin/env bash
# PLANO 9,5 (2026-09-26): roda todos os testes SQL de supabase/testes num
# banco (padrão: Supabase local do `supabase start`/`supabase db start`).
# Cada teste roda numa transação e desfaz no fim. Falha se algum teste der
# erro, se alguma linha sair FALHOU ou se um teste não devolver nenhuma linha.
# Uso: supabase/testes/rodar.sh [URL do banco]
set -uo pipefail
BANCO="${1:-${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}}"
PASTA="$(cd "$(dirname "$0")" && pwd)"
total_ok=0
total_falhou=0
com_erro=()

for arquivo in "$PASTA"/*.sql; do
  nome="$(basename "$arquivo")"
  if ! saida="$(psql "$BANCO" -X -q -At -F '|' -v ON_ERROR_STOP=1 -f "$arquivo" 2>&1)"; then
    echo "ERRO  $nome"
    echo "$saida" | tail -n 5 | sed 's/^/      /'
    com_erro+=("$nome")
    continue
  fi
  ok=$(grep -c '|OK$' <<<"$saida" || true)
  falhou=$(grep -c '|FALHOU$' <<<"$saida" || true)
  total_ok=$((total_ok + ok))
  total_falhou=$((total_falhou + falhou))
  if [ "$falhou" -gt 0 ] || [ "$ok" -eq 0 ]; then
    echo "FALHA $nome ($ok ok, $falhou falharam)"
    grep '|FALHOU$' <<<"$saida" | sed 's/^/      /'
    com_erro+=("$nome")
  else
    echo "OK    $nome ($ok/$ok)"
  fi
done

echo "Total: $total_ok ok, $total_falhou falharam, ${#com_erro[@]} arquivo(s) com problema."
[ "${#com_erro[@]}" -eq 0 ]
