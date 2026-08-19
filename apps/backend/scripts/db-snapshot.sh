#!/usr/bin/env bash
set -euo pipefail

# Required environment variables (fall back to the same names used by the app)
DB_HOST="${DB_POSTGRES_HOST:?'DB_POSTGRES_HOST is required'}"
DB_PORT="${DB_POSTGRES_PORT:?'DB_POSTGRES_PORT is required'}"
DB_NAME="${DB_POSTGRES_DATABASE_NAME:?'DB_POSTGRES_DATABASE_NAME is required'}"
DB_USER="${DB_POSTGRES_USERNAME:?'DB_POSTGRES_USERNAME is required'}"
DB_PASS="${DB_POSTGRES_PASSWORD:?'DB_POSTGRES_PASSWORD is required'}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_DIR="${SNAPSHOT_DIR:-./snapshots}"
OUTPUT_FILE="${OUTPUT_DIR}/${DB_NAME}_${TIMESTAMP}.sql"

mkdir -p "$OUTPUT_DIR"

echo "Taking snapshot of database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

# Dump to a temporary file in the same directory and move it into place only on
# success. Redirecting straight to $OUTPUT_FILE created the file before pg_dump
# ran, so any failure (a client/server version mismatch, bad credentials, a
# dropped connection) left a 0-byte .sql behind — and db-restore.sh defaults to
# the newest .sql in this directory, so the next restore would drop every table
# and then restore nothing. The dotted prefix also keeps the partial file out of
# the *.sql globs while it is being written.
TMP_FILE="$(mktemp "${OUTPUT_DIR}/.${DB_NAME}_${TIMESTAMP}.sql.XXXXXX")"
cleanup() { rm -f "$TMP_FILE"; }
trap cleanup EXIT

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-privileges \
  > "$TMP_FILE"

mv "$TMP_FILE" "$OUTPUT_FILE"
trap - EXIT

chmod 444 "$OUTPUT_FILE"

echo "Snapshot saved to ${OUTPUT_FILE} (read-only)"
