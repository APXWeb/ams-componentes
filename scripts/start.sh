#!/bin/sh
# Inicialização em produção (Docker): prepara o disco persistente, o banco e sobe o Next.js.
#   SEED_DEMO=1        primeiro boot com dados de demonstração (apresentação ao cliente)
#   SEED_DEMO=0        primeiro boot com banco vazio + admin (ADMIN_EMAIL / ADMIN_PASSWORD)
set -e

: "${DATABASE_PATH:=/data/ams.db}"
: "${STORAGE_PATH:=/data/storage}"
export DATABASE_PATH STORAGE_PATH

mkdir -p "$(dirname "$DATABASE_PATH")" "$STORAGE_PATH"

if [ ! -f "$DATABASE_PATH" ]; then
  echo "Primeiro boot: criando banco em $DATABASE_PATH"
  if [ "${SEED_DEMO:-1}" = "1" ]; then
    npx tsx scripts/db-setup.ts
  else
    npx tsx scripts/db-setup.ts --empty
  fi
else
  npx tsx scripts/migrate.ts
fi

exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
