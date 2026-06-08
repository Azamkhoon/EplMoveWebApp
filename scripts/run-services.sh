#!/usr/bin/env bash
# Start all built EPL Move services as background processes (dev). They run on
# the host against the dockerized infra. Logs → /tmp/epl-<svc>.log,
# PIDs → /tmp/epl-pids. Stop with: bash scripts/stop-services.sh
# (Bash 3.2 compatible — macOS system bash.)
set -eo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# Each service loads .env itself via @epl/config (dotenv walks up to repo root).

# "svc:port" pairs, started in dependency order.
SERVICES="tenant-svc:8082 auth-svc:8081 load-svc:8083 carrier-svc:8084 quote-svc:8085 shipment-svc:8086 tracking-svc:8087 doc-svc:8088 genius-svc:8089 billing-svc:8090 notify-svc:8091 api-gateway:8080"

: > /tmp/epl-pids
for pair in $SERVICES; do
  svc="${pair%%:*}"; port="${pair##*:}"
  PORT="$port" nohup node "$ROOT/services/$svc/dist/main.js" > "/tmp/epl-$svc.log" 2>&1 &
  pid=$!
  disown "$pid" 2>/dev/null || true
  echo "$pid" >> /tmp/epl-pids
  echo "started $svc (pid $pid, :$port)"
done

echo "waiting for health…"
for pair in $SERVICES; do
  svc="${pair%%:*}"; port="${pair##*:}"
  for i in $(seq 1 30); do
    if curl -fsS "http://localhost:$port/health" >/dev/null 2>&1; then
      echo "  ✓ $svc healthy (:$port)"; break
    fi
    if [ "$i" = 30 ]; then
      echo "  ✗ $svc did NOT become healthy — see /tmp/epl-$svc.log"; tail -6 "/tmp/epl-$svc.log"
    fi
    sleep 1
  done
done
echo "all services launched."

# Stay in the foreground so this launcher (and thus its child services) keeps
# running for the lifetime of the background task. `wait` blocks on all children.
if [ "${KEEP_ALIVE:-1}" = "1" ]; then
  echo "(launcher holding services alive; stop with scripts/stop-services.sh)"
  wait
fi
