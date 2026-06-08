#!/usr/bin/env bash
# Stop services started by run-services.sh.
if [ -f /tmp/epl-pids ]; then
  while read -r pid; do kill "$pid" 2>/dev/null && echo "stopped $pid"; done < /tmp/epl-pids
  rm -f /tmp/epl-pids
else
  echo "no /tmp/epl-pids; nothing to stop"
fi
