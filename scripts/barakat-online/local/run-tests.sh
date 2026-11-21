#!/usr/bin/env bash
# اختبار بركات السحابي كاملاً على جهازك دون أي خدمة خارجية:
# قاعدة Postgres جديدة + محاكي Supabase + خادم بركات نفسه + اختبار الواجهة بكل الأدوار (e2e.cjs) + فحوص الأمان.
# المتطلبات: Postgres يعمل (PGHOST/PGPORT/PGUSER)، Node 22، وحزمتا pg وplaywright (PG_MODULE_DIR ومسار NODE_PATH).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"
: "${PGHOST:=/var/tmp}" "${PGPORT:=55432}" "${PGUSER:=postgres}" "${PORT:=54321}"
export PGHOST PGPORT PGUSER
DB="barakat_test_$(date +%s)"
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "create database $DB"
$P -d "$DB" -f "$HERE/auth-shim.sql"
$P -d "$DB" -f "$HERE/../schema.sql" 2>/dev/null
$P -d "$DB" -c "grant all on all tables in schema public to service_role"
node "$HERE/../build.mjs"
PGURL="postgres://$PGUSER@localhost/$DB?host=$PGHOST&port=$PGPORT" PORT=$PORT node --experimental-strip-types --no-warnings "$HERE/mock-supabase.mjs" > "${MOCK_LOG:-/tmp/barakat-mock.log}" 2>&1 &
MOCK=$!; trap 'kill $MOCK 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/barakat/" && break; sleep 0.5; done
OUT="${SHOTS:-$ROOT/shots-cloud}"
CLOUD_URL="http://127.0.0.1:$PORT" CLOUD_KEY=local-anon-key BASE="http://127.0.0.1:$PORT/barakat/" node "$ROOT/scripts/barakat-desktop/e2e.cjs" - "$OUT"
DB="$DB" PORT=$PORT node "$HERE/security.mjs"
PGURL="postgres://$PGUSER@localhost/$DB?host=$PGHOST&port=$PGPORT" PORT=$((PORT+1)) node --experimental-strip-types --no-warnings "$HERE/mock-supabase.mjs" > /dev/null 2>&1 &
MOCK2=$!; trap 'kill $MOCK $MOCK2 2>/dev/null || true' EXIT; sleep 2
PORT=$PORT PORT2=$((PORT+1)) node "$HERE/concurrency.mjs"
echo "قاعدة الاختبار: $DB"
