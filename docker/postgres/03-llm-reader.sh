#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Guardrail Layer 3 (CLAUDE.md §2/§3, prompt_spec.md §3) — create the read-only
# `llm_reader` role that executes LLM-generated SQL. It may SELECT from
# financial_data ONLY: no writes, no object creation, and no access to any app
# table created later by TypeORM migrations (users, conversations, ...).
#
# Runs inside the postgres container on first init. Credentials come from the
# container environment (set in docker-compose.yml), never hardcoded.
# ─────────────────────────────────────────────────────────────────────────────
set -e

: "${LLM_READER_USER:?LLM_READER_USER is required}"
: "${LLM_READER_PASSWORD:?LLM_READER_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
  -- Create the role if it does not already exist
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${LLM_READER_USER}') THEN
      CREATE ROLE ${LLM_READER_USER} LOGIN PASSWORD '${LLM_READER_PASSWORD}';
    END IF;
  END
  \$\$;

  -- Minimal read-only grants: connect, use the schema, SELECT the one table
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${LLM_READER_USER};
  GRANT USAGE  ON SCHEMA public          TO ${LLM_READER_USER};
  GRANT SELECT ON financial_data         TO ${LLM_READER_USER};

  -- Defense in depth: cannot create objects, and gets NO privileges on any
  -- table created later in this schema by the app/migration role.
  REVOKE CREATE ON SCHEMA public FROM ${LLM_READER_USER};
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${LLM_READER_USER};
EOSQL

echo "llm_reader role provisioned (SELECT-only on financial_data)."
