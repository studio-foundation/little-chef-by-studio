#!/usr/bin/env bash
set -euo pipefail

QUERY="${1:?Usage: tavily-search.sh <query>}"
CONFIG="$(dirname "$0")/../.studio/config.yaml"

# Read TAVILY_API_KEY from .studio/config.yaml env section, fall back to environment
if [[ -f "$CONFIG" ]]; then
  KEY=$(grep 'TAVILY_API_KEY:' "$CONFIG" | sed 's/.*TAVILY_API_KEY:[[:space:]]*//' | tr -d '"' | tr -d "'")
fi
KEY="${KEY:-${TAVILY_API_KEY:-}}"

if [[ -z "$KEY" ]]; then
  echo '{"error":"TAVILY_API_KEY not found in .studio/config.yaml or environment"}' >&2
  exit 1
fi

curl -s -X POST "https://api.tavily.com/search" \
  -H "Content-Type: application/json" \
  -d "{\"api_key\": \"$KEY\", \"query\": $(printf '%s' "$QUERY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"max_results\": 5}"
