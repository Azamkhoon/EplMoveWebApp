#!/usr/bin/env bash
# Phase 1 end-to-end smoke test: register → login → post load → list.
# Prereqs: infra up (pnpm infra:up), migrations run, all 4 services + gateway running.
# See scripts/dev-runbook.md.
set -euo pipefail

GW="${GATEWAY_URL:-http://localhost:8080}"
EMAIL="founder+$(date +%s)@acme.test"
PASS="supersecret123"
JAR="$(mktemp)"

say() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

say "Gateway health"
curl -fsS "$GW/health" | jq . || fail "gateway not reachable at $GW"

say "Register (creates user + tenant + admin membership)"
REG=$(curl -fsS -c "$JAR" -X POST "$GW/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Founder\",\"tenantName\":\"Acme Logistics\"}")
echo "$REG" | jq .
ACCESS=$(echo "$REG" | jq -r .accessToken)
[ "$ACCESS" != "null" ] || fail "no access token from register"

say "Post a load"
LOAD=$(curl -fsS -X POST "$GW/loads" \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"mode":"Ocean","commodity":"Machinery","equipmentKind":"container","equipmentCode":"40hc",
       "pickup":{"city":"Shanghai","country":"China","lat":31.2,"lng":121.5},
       "delivery":{"city":"Rotterdam","country":"Netherlands","lat":51.9,"lng":4.5},
       "weightKg":18400,"volumeM3":58,"pieces":12,"incoterm":"FOB","asDraft":false}')
echo "$LOAD" | jq .
REF=$(echo "$LOAD" | jq -r .reference)
LID=$(echo "$LOAD" | jq -r .id)
[ "$REF" != "null" ] || fail "load not created"
echo "created $REF ($LID)"

say "List loads (should contain the new one)"
curl -fsS "$GW/loads" -H "authorization: Bearer $ACCESS" | jq '[.[] | {reference,status,mode}]'

say "Duplicate → new draft"
curl -fsS -X POST "$GW/loads/$LID/duplicate" -H "authorization: Bearer $ACCESS" | jq '{reference,status}'

say "Cancel the original"
curl -fsS -X POST "$GW/loads/$LID/cancel" -H "authorization: Bearer $ACCESS" | jq '{reference,status}'

say "RBAC negative: tampered token must 401"
curl -s -o /dev/null -w "%{http_code}\n" "$GW/loads" -H "authorization: Bearer not.a.jwt" | grep -q 401 \
  && echo "✓ rejected" || fail "tampered token was not rejected"

say "Login again (password) to confirm credentials persisted"
curl -fsS -X POST "$GW/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq '{expiresIn}'

printf "\n\033[1;32m✓ Phase 1 end-to-end OK\033[0m\n"
rm -f "$JAR"
