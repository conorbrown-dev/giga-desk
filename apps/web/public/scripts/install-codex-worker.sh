#!/usr/bin/env bash
set -euo pipefail

if ! command -v codex >/dev/null 2>&1; then
  echo 'Codex is not installed or is not on PATH. Install it, then run this script again.' >&2
  exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo 'This installer requires systemd user services.' >&2
  exit 1
fi

default_checkout=$(pwd)
read -r -p "Giga Desk checkout [$default_checkout]: " CHECKOUT
CHECKOUT=${CHECKOUT:-$default_checkout}
if [[ ! -f "$CHECKOUT/package.json" ]] || [[ ! -d "$CHECKOUT/apps/codex-worker" ]]; then
  echo 'The checkout must contain the Giga Desk package.json and apps/codex-worker.' >&2
  exit 1
fi
if [[ ! -d "$CHECKOUT/node_modules" ]]; then
  (cd "$CHECKOUT" && npm ci)
fi

read -r -p 'Giga Desk worker API URL: ' API_URL
read -r -p 'Execution node ID: ' NODE_ID
read -r -p 'OIDC token URL: ' TOKEN_URL
read -r -p 'OIDC client ID: ' CLIENT_ID
read -r -s -p 'OIDC client secret: ' CLIENT_SECRET
printf '\n'
read -r -p 'Project repository map as JSON: ' REPOSITORIES
if [[ -z "$REPOSITORIES" ]]; then
  echo 'A repository map is required.' >&2
  exit 1
fi

config_dir="$HOME/.config/giga-desk"
service_dir="$HOME/.config/systemd/user"
codex_dir=$(dirname "$(command -v codex)")
mkdir -p "$config_dir" "$service_dir"
umask 077
printf 'GIGA_DESK_AGENT_API_URL=%s\nGIGA_DESK_AGENT_NODE_ID=%s\nGIGA_DESK_AGENT_OIDC_TOKEN_URL=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_ID=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_SECRET=%s\n' "$API_URL" "$NODE_ID" "$TOKEN_URL" "$CLIENT_ID" "$CLIENT_SECRET" > "$config_dir/agent.env"
printf 'GIGA_DESK_WORKER_AGENT_TYPE=CodexCli\nGIGA_DESK_WORKER_REPOSITORIES=%s\nGIGA_DESK_AGENT_POLL_INTERVAL_MS=5000\nGIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS=30000\n' "$REPOSITORIES" > "$config_dir/worker.env"
chmod 600 "$config_dir/agent.env" "$config_dir/worker.env"

(cd "$CHECKOUT" && npm run build -w @giga-desk/agent-client && npm run build -w @giga-desk/codex-worker)
cat > "$service_dir/giga-desk-codex-worker.service" <<EOF
[Unit]
Description=Giga Desk Codex worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$CHECKOUT
Environment=PATH=$codex_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
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
echo 'The authenticated worker registers Codex and the node should become Online. View logs with: journalctl --user -u giga-desk-codex-worker.service -f'
