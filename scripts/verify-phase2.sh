#!/usr/bin/env bash
# Phase 2 end-to-end: post load → request quotes → compare bids → accept →
# (bid.accepted event) → shipment-svc creates the shipment.
# Prereqs: infra up; migrations run for auth/tenant/load/carrier/quote/shipment;
# all those services + api-gateway running. See scripts/dev-runbook.md.
set -euo pipefail

GW="${GATEWAY_URL:-http://localhost:8080}"
EMAIL="trader+$(date +%s)@acme.test"
PASS="supersecret123"

say() { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }

say "Register"
ACCESS=$(curl -fsS -X POST "$GW/auth/register" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Trader\",\"tenantName\":\"Globex\"}" | jq -r .accessToken)
[ "$ACCESS" != "null" ] || fail "register failed"
AUTH=(-H "authorization: Bearer $ACCESS")

say "Carriers available (seeded)"
curl -fsS "${AUTH[@]}" "$GW/carriers" | jq '[.[] | {name, rating, reliability}] | .[0:4]'

say "Post a load"
LID=$(curl -fsS "${AUTH[@]}" -X POST "$GW/loads" -H 'content-type: application/json' \
  -d '{"mode":"Ocean","commodity":"Furniture","equipmentKind":"container","equipmentCode":"40hc",
       "pickup":{"city":"Shanghai","country":"China","lat":31.2,"lng":121.5},
       "delivery":{"city":"Hamburg","country":"Germany","lat":53.5,"lng":10.0},
       "weightKg":16800,"volumeM3":71,"pieces":34,"asDraft":false}' | jq -r .id)
REF=$(curl -fsS "${AUTH[@]}" "$GW/loads/$LID" | jq -r .reference)
echo "posted $REF"

say "Request quotes (auto-generates carrier bids)"
QID=$(curl -fsS "${AUTH[@]}" -X POST "$GW/quotes" -H 'content-type: application/json' \
  -d "{\"loadId\":\"$LID\",\"reference\":\"$REF\",\"mode\":\"Ocean\"}" | jq -r .id)
echo "quote $QID"

say "Compare bids"
BIDS=$(curl -fsS "${AUTH[@]}" "$GW/quotes/$QID")
echo "$BIDS" | jq '[.bids[] | {carrier: .carrier.name, price: .price.amount, days: .transitDays, rating: .carrier.rating}]'
BID=$(echo "$BIDS" | jq -r '[.bids[]] | sort_by(.price.amount)[0].id')
[ "$BID" != "null" ] || fail "no bids generated (is carrier-svc seeded + running?)"

say "Accept the cheapest bid → triggers bid.accepted"
curl -fsS "${AUTH[@]}" -X POST "$GW/quotes/$QID/bids/$BID/accept" | jq '{status}'

say "Poll for the shipment created by the event consumer"
SHIP=""
for i in $(seq 1 12); do
  sleep 1
  SHIP=$(curl -fsS "${AUTH[@]}" "$GW/shipments" | jq -c "[.[] | select(.quoteId==\"$QID\")][0] // empty")
  [ -n "$SHIP" ] && break
done
[ -n "$SHIP" ] || fail "shipment not created from bid.accepted (check quote/shipment outbox + emulator)"
echo "$SHIP" | jq '{reference, carrierName, status, transitDays, price: .price.amount}'

printf "\n\033[1;32m✓ Phase 2 end-to-end OK (quote→bid→accept→event→shipment)\033[0m\n"
