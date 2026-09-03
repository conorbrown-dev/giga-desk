#!/usr/bin/env bash
set -euo pipefail

if ! command -v opencode >/dev/null 2>&1; then
  echo 'OpenCode is not installed or is not on PATH. Install it, then run this script again.' >&2
  exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo 'This installer requires systemd user services.' >&2
  exit 1
fi

CHECKOUT=${GIGA_DESK_WORKER_CHECKOUT:-$(pwd)}
if [[ ! -f "$CHECKOUT/package.json" ]] || [[ ! -d "$CHECKOUT/apps/codex-worker" ]]; then
  echo "The checkout '$CHECKOUT' must contain the Giga Desk package.json and apps/codex-worker. Run this from the Giga Desk checkout or set GIGA_DESK_WORKER_CHECKOUT to its absolute path." >&2
  exit 1
fi
if [[ ! -d "$CHECKOUT/node_modules" ]]; then
  (cd "$CHECKOUT" && npm ci)
fi

config_dir="$HOME/.config/giga-desk"
service_dir="$HOME/.config/systemd/user"
if [[ -f "$config_dir/agent.env" ]]; then
  set -a
  # This file is created by this installer with mode 0600.
  source "$config_dir/agent.env"
  set +a
fi
if [[ -f "$config_dir/worker.env" ]]; then
  set -a
  source "$config_dir/worker.env"
  set +a
fi

API_URL=${GIGA_DESK_AGENT_API_URL:-}
NODE_ID=${GIGA_DESK_AGENT_NODE_ID:-}
TOKEN_URL=${GIGA_DESK_AGENT_OIDC_TOKEN_URL:-}
CLIENT_ID=${GIGA_DESK_AGENT_OIDC_CLIENT_ID:-}
CLIENT_SECRET=${GIGA_DESK_AGENT_OIDC_CLIENT_SECRET:-}
AGENT_NAME=${GIGA_DESK_WORKER_AGENT_NAME:-MIRIAM}
MODEL=${GIGA_DESK_WORKER_MODEL_IDENTIFIER:-ollama/qwen3-coder-next:q4_K_M}
REPOSITORIES=${GIGA_DESK_WORKER_REPOSITORIES:-}
if [[ -z "$REPOSITORIES" ]]; then
  remote_url=$(git -C "$CHECKOUT" remote get-url origin 2>/dev/null || true)
  if [[ -n "$remote_url" ]]; then
    REPOSITORIES=$(node -e 'console.log(JSON.stringify([{ url: process.argv[1], path: process.argv[2] }]))' "$remote_url" "$CHECKOUT")
  fi
fi
missing=()
for setting in GIGA_DESK_AGENT_API_URL GIGA_DESK_AGENT_NODE_ID GIGA_DESK_AGENT_OIDC_TOKEN_URL GIGA_DESK_AGENT_OIDC_CLIENT_ID GIGA_DESK_AGENT_OIDC_CLIENT_SECRET; do
  [[ -n "${!setting:-}" ]] || missing+=("$setting")
done
if (( ${#missing[@]} > 0 )); then
  echo "Worker identity is not configured. Provide the protected agent.env file or export: ${missing[*]}" >&2
  exit 1
fi
if [[ -z "$REPOSITORIES" ]]; then
  echo 'No repository mapping is configured and no origin remote could be derived. Set GIGA_DESK_WORKER_REPOSITORIES.' >&2
  exit 1
fi

mkdir -p "$config_dir" "$service_dir"
umask 077
printf 'GIGA_DESK_AGENT_API_URL=%s\nGIGA_DESK_AGENT_NODE_ID=%s\nGIGA_DESK_AGENT_OIDC_TOKEN_URL=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_ID=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_SECRET=%s\n' "$API_URL" "$NODE_ID" "$TOKEN_URL" "$CLIENT_ID" "$CLIENT_SECRET" > "$config_dir/agent.env"
printf 'GIGA_DESK_WORKER_AGENT_TYPE=OpenCode\nGIGA_DESK_WORKER_AGENT_NAME=%s\nGIGA_DESK_WORKER_MODEL_IDENTIFIER=%s\nGIGA_DESK_WORKER_REPOSITORIES=%s\nGIGA_DESK_AGENT_POLL_INTERVAL_MS=5000\nGIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS=30000\n' "$AGENT_NAME" "$MODEL" "$REPOSITORIES" > "$config_dir/worker.env"
chmod 600 "$config_dir/agent.env" "$config_dir/worker.env"

(cd "$CHECKOUT" && npm run build -w @giga-desk/agent-client && npm run build -w @giga-desk/codex-worker)
cat > "$service_dir/giga-desk-codex-worker.service" <<EOF
[Unit]
Description=Giga Desk OpenCode worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$CHECKOUT
Environment=PATH=$HOME/.opencode/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EnvironmentFile=$config_dir/agent.env
EnvironmentFile=$config_dir/worker.env
ExecStart=/usr/bin/npm run start -w @giga-desk/codex-worker
Restart=on-failure
RestartSec=10
NoNewPrivileges=true
PrivateTmp=true
RestrictSUIDSGID=true

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now giga-desk-codex-worker.service
systemctl --user restart giga-desk-codex-worker.service
systemctl --user --no-pager status giga-desk-codex-worker.service
echo 'The node should become Online in Giga Desk. View logs with: journalctl --user -u giga-desk-codex-worker.service -f'
