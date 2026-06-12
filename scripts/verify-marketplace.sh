#!/usr/bin/env bash
# Two-sided marketplace e2e: shipper opens a quote → carrier (separate tenant)
# discovers it cross-tenant, bids → shipper accepts the carrier's bid → shipment.
set -euo pipefail
GW="${GW:-http://localhost:8080}"
hdr() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
die() { printf '  \033[31m✗ %s\033[0m\n' "$1"; exit 1; }

hdr "1. Shipper opens a quote"
SH=$(curl -s -X POST "$GW/auth/login" -H 'content-type: application/json' \
  -d '{"email":"demo@acme-logistics.test","password":"demo12345"}' | jq -r .accessToken)
[ -n "$SH" ] && [ "$SH" != null ] || die "shipper login failed"
LOAD=$(curl -s -X POST "$GW/loads" -H "authorization: Bearer $SH" -H 'content-type: application/json' \
  -d '{"mode":"Ocean","commodity":"Marketplace verify","equipmentKind":"container","equipmentCode":"40hc","pickup":{"city":"Ningbo","country":"China","lat":29.87,"lng":121.54},"delivery":{"city":"Antwerp","country":"Belgium","lat":51.26,"lng":4.41},"weightKg":18000,"volumeM3":56,"pieces":11,"incoterm":"FOB","asDraft":false}')
LID=$(echo "$LOAD" | jq -r .id); REF=$(echo "$LOAD" | jq -r .reference)
QID=$(curl -s -X POST "$GW/quotes" -H "authorization: Bearer $SH" -H 'content-type: application/json' \
  -d "{\"loadId\":\"$LID\",\"reference\":\"$REF\",\"mode\":\"Ocean\"}" | jq -r .id)
[ "$QID" != null ] || die "quote create failed"
ok "quote $REF ($QID) opened"

hdr "2. Register a carrier tenant"
CE="carrier-$(date +%s)@verify.test"
CA=$(curl -s -X POST "$GW/auth/register" -H 'content-type: application/json' \
  -d "{\"email\":\"$CE\",\"password\":\"carrier123\",\"name\":\"Carrier Ops\",\"tenantName\":\"Verify Carrier Lines\",\"kind\":\"carrier\"}" | jq -r .accessToken)
[ -n "$CA" ] && [ "$CA" != null ] || die "carrier register failed"
ROLE=$(printf '%s' "$CA" | cut -d. -f2 | base64 -d 2>/dev/null | jq -r .role)
ok "carrier registered (role=$ROLE)"

hdr "3. Carrier discovers the open quote cross-tenant"
SEEN=no
for _ in 1 2 3 4 5; do
  if curl -s "$GW/marketplace/quotes" -H "authorization: Bearer $CA" | jq -e --arg q "$QID" 'any(.[]; .id==$q)' >/dev/null; then
    SEEN=yes; break
  fi
  sleep 1
done
[ "$SEEN" = yes ] && ok "carrier sees $REF in the marketplace" || die "carrier cannot see the open quote"

hdr "4. Carrier submits a bid"
BID=$(curl -s -X POST "$GW/marketplace/quotes/$QID/bids" -H "authorization: Bearer $CA" -H 'content-type: application/json' \
  -d '{"price":{"amount":8050,"currency":"USD"},"transitDays":26,"co2Kg":3300}')
BIDID=$(echo "$BID" | jq -r '.id // empty')
[ -n "$BIDID" ] || die "bid failed: $(echo "$BID" | jq -c .)"
CARRIER_ID=$(echo "$BID" | jq -r .carrierId)
ok "bid $BIDID submitted (carrierId=$CARRIER_ID)"

hdr "5. Carrier sees it under My Bids"
curl -s "$GW/marketplace/bids" -H "authorization: Bearer $CA" | jq -e --arg b "$BIDID" 'any(.[]; .id==$b)' >/dev/null \
  && ok "bid appears in /marketplace/bids" || die "bid missing from My Bids"

hdr "6. Shipper sees the carrier's bid + accepts it"
curl -s "$GW/quotes/$QID" -H "authorization: Bearer $SH" | jq -e --arg b "$BIDID" 'any(.bids[]?; .id==$b)' >/dev/null \
  && ok "shipper sees the carrier bid" || die "shipper cannot see the carrier bid"
curl -s -X POST "$GW/quotes/$QID/bids/$BIDID/accept" -H "authorization: Bearer $SH" >/dev/null
sleep 3

hdr "7. Shipment created from the carrier's bid"
NAME=$(curl -s "$GW/shipments" -H "authorization: Bearer $SH" | jq -r --arg r "$REF" '.[]|select(.reference==$r)|.carrierName')
[ -n "$NAME" ] || die "no shipment created for $REF"
ok "shipment created, carrierName=$NAME"

hdr "8. Carrier's bid now shows the quote as awarded"
ST=$(curl -s "$GW/marketplace/bids" -H "authorization: Bearer $CA" | jq -r --arg r "$REF" '.[]|select(.reference==$r)|.quoteStatus')
[ "$ST" = awarded ] && ok "carrier My Bids shows [$ST]" || die "expected awarded, got [$ST]"

printf '\n\033[1;32m✓ Two-sided marketplace e2e PASSED\033[0m\n'
