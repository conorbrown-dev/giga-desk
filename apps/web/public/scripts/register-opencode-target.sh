#!/usr/bin/env bash
set -euo pipefail

read -r -s -p 'Giga Desk API database URL: ' DATABASE_URL
printf '\n'
read -r -p 'OpenCode agent name [MIRIAM]: ' AGENT_NAME
AGENT_NAME=${AGENT_NAME:-MIRIAM}
read -r -p 'OpenCode provider/model [ollama/qwen3-coder-next:q4_K_M]: ' MODEL
MODEL=${MODEL:-ollama/qwen3-coder-next:q4_K_M}

if [[ ! -f package.json ]] || [[ ! -d apps/api ]]; then
  echo 'Run this script from the Giga Desk repository checkout.' >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi
npm run build -w @giga-desk/api
DATABASE_URL="$DATABASE_URL" npm run target:opencode -w @giga-desk/api -- "$AGENT_NAME" "$MODEL"
echo 'Copy the printed execution node ID into the worker setup script.'
