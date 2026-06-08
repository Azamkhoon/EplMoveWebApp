#!/usr/bin/env bash
# Phase 5 end-to-end: accepting a bid must (via Pub/Sub) raise an invoice in
# billing-svc AND create notifications in notify-svc. Prereqs: full stack up.
set -euo pipefail

GW="${GATEWAY_URL:-http://localhost:8080}"
EMAIL="ops+$(date +%s)@acme.test"
PASS="supersecret123"

say()  { printf "\n\033[1;34m▶ %s\033[0m\n" "$1"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$1"; exit 1; }
pass() { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }

say "Register"
ACCESS=$(curl -fsS -X POST "$GW/auth/register" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Ops\",\"tenantName\":\"Acme Logistics\"}" | jq -r .accessToken)
[ "$ACCESS" != "null" ] || fail "no access token"
AUTH="authorization: Bearer $ACCESS"

say "Confirm new permissions present in token"
echo "$ACCESS" | cut -d. -f2 | base64 2>/dev/null >/dev/null # noop; decode below in node
node -e 'const c=JSON.parse(Buffer.from(process.argv[1].split(".")[1],"base64url"));const need=["billing:read","billing:pay","notify:read"];const miss=need.filter(p=>!c.perms.includes(p));if(miss.length){console.error("missing perms:",miss.join(","));process.exit(1)}' "$ACCESS" \
  && pass "billing:read, billing:pay, notify:read in token" || fail "expected billing/notify perms in token (re-seed tenant-svc)"

say "Post a load"
LOAD=$(curl -fsS -X POST "$GW/loads" -H "$AUTH" -H 'content-type: application/json' \
  -d '{"mode":"Ocean","commodity":"Machinery","equipmentKind":"container","equipmentCode":"40hc",
       "pickup":{"city":"Shanghai","country":"China","lat":31.2,"lng":121.5},
       "delivery":{"city":"Rotterdam","country":"Netherlands","lat":51.9,"lng":4.5},
       "weightKg":18400,"volumeM3":58,"pieces":12,"incoterm":"FOB","asDraft":false}')
LID=$(echo "$LOAD" | jq -r .id); REF=$(echo "$LOAD" | jq -r .reference)
[ "$LID" != "null" ] || fail "load not created"
pass "load $LID ($REF)"

say "Request quotes + accept cheapest bid"
QID=$(curl -fsS -X POST "$GW/quotes" -H "$AUTH" -H 'content-type: application/json' \
  -d "{\"loadId\":\"$LID\",\"reference\":\"$REF\",\"mode\":\"Ocean\"}" | jq -r .id)
BID=$(curl -fsS "$GW/quotes/$QID" -H "$AUTH" | jq -r '[.bids[]] | sort_by(.price.amount)[0].id')
curl -fsS -X POST "$GW/quotes/$QID/bids/$BID/accept" -H "$AUTH" >/dev/null
pass "accepted bid $BID (→ bid.accepted)"

say "Poll billing-svc for the invoice raised from the event"
INV=""
for i in $(seq 1 20); do
  INV=$(curl -fsS "$GW/invoices" -H "$AUTH" | jq -r '.[0] // empty')
  [ -n "$INV" ] && break
  sleep 1
done
[ -n "$INV" ] || fail "no invoice created from bid.accepted (check billing consumer + outbox)"
echo "$INV" | jq '{number,status,reference,amount}'
NUM=$(echo "$INV" | jq -r .number); IID=$(echo "$INV" | jq -r .id)
pass "invoice $NUM issued"

say "Pay the invoice"
curl -fsS -X POST "$GW/invoices/$IID/pay" -H "$AUTH" | jq '{number,status,paidAt}'
PAID=$(curl -fsS "$GW/invoices/$IID" -H "$AUTH" | jq -r .status)
[ "$PAID" = "paid" ] && pass "invoice marked paid" || fail "invoice not paid"

say "Poll notify-svc for notifications materialized from events"
N=0
for i in $(seq 1 20); do
  N=$(curl -fsS "$GW/notifications" -H "$AUTH" | jq 'length')
  [ "$N" -ge 2 ] && break
  sleep 1
done
curl -fsS "$GW/notifications" -H "$AUTH" | jq '[.[] | {kind,title}]'
[ "$N" -ge 2 ] || fail "expected >=2 notifications (bid_accepted, shipment_created, invoice_issued)"
pass "$N notifications created"

say "Mark all notifications read"
curl -fsS -X POST "$GW/notifications/read" -H "$AUTH" -H 'content-type: application/json' -d '{}' | jq .
UNREAD=$(curl -fsS "$GW/notifications" -H "$AUTH" | jq '[.[] | select(.read==false)] | length')
[ "$UNREAD" = "0" ] && pass "all marked read" || fail "still $UNREAD unread"

printf "\n\033[1;32m✓ Phase 5 end-to-end OK (bid.accepted → invoice + notifications, pay, mark-read)\033[0m\n"
