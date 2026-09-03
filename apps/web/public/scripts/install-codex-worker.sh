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

if ! command -v node >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1 || ! command -v sha256sum >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
  echo 'This installer requires Node.js, curl, sha256sum, and tar on PATH.' >&2
  exit 1
fi

config_dir="$HOME/.config/giga-desk"
service_dir="$HOME/.config/systemd/user"
service_file="$service_dir/giga-desk-codex-worker.service"
release_root="$HOME/.local/share/giga-desk/worker"
runner_file="$config_dir/task/run-worker.ps1"
if [[ -f "$service_file" || -d "$release_root" || -f "$runner_file" ]]; then
  read -r -p 'A previous Giga Desk worker installation was found. Remove its service and downloaded worker artifacts before continuing? [y/N] ' remove_previous
  if [[ ! "$remove_previous" =~ ^[Yy]$ ]]; then
    echo 'Existing installation left unchanged.' >&2
    exit 1
  fi
  systemctl --user disable --now giga-desk-codex-worker.service >/dev/null 2>&1 || true
  rm -f "$service_file" "$runner_file"
  rm -rf "$release_root"
fi
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
REPOSITORIES=${GIGA_DESK_WORKER_REPOSITORIES:-}
REPOSITORIES=${REPOSITORIES:-[]}
if ! node -e 'const value = JSON.parse(process.argv[1]); process.exit(Array.isArray(value) ? 0 : 1)' "$REPOSITORIES"; then
  echo 'The existing GIGA_DESK_WORKER_REPOSITORIES value is invalid; resetting it to an empty repository map.' >&2
  REPOSITORIES='[]'
fi
missing=()
for setting in GIGA_DESK_AGENT_API_URL GIGA_DESK_AGENT_NODE_ID GIGA_DESK_AGENT_OIDC_TOKEN_URL GIGA_DESK_AGENT_OIDC_CLIENT_ID GIGA_DESK_AGENT_OIDC_CLIENT_SECRET; do
  [[ -n "${!setting:-}" ]] || missing+=("$setting")
done
if (( ${#missing[@]} > 0 )); then
  echo "Worker identity is not configured. Provide the protected agent.env file or export: ${missing[*]}" >&2
  exit 1
fi
release_url=${GIGA_DESK_WORKER_RELEASE_URL:-}
if [[ -z "$release_url" ]]; then
  release_origin=$(node -e 'console.log(new URL(process.argv[1]).origin)' "$API_URL")
  release_url="$release_origin/releases/giga-desk-worker.tgz"
fi
download_dir=$(mktemp -d)
trap 'rm -rf "$download_dir"' EXIT
curl --fail --silent --show-error --location "$release_url" --output "$download_dir/worker.tgz"
curl --fail --silent --show-error --location "$release_url.sha256" --output "$download_dir/worker.tgz.sha256"
expected_sha=$(awk '{ print $1 }' "$download_dir/worker.tgz.sha256")
actual_sha=$(sha256sum "$download_dir/worker.tgz" | awk '{ print $1 }')
if [[ "$expected_sha" != "$actual_sha" ]]; then
  echo 'The downloaded worker bundle checksum does not match.' >&2
  exit 1
fi
release_dir="$release_root/releases/$actual_sha"
if [[ ! -d "$release_dir" ]]; then
  mkdir -p "$release_dir"
  tar -xzf "$download_dir/worker.tgz" -C "$release_dir"
fi

codex_dir=$(dirname "$(command -v codex)")
mkdir -p "$config_dir" "$service_dir"
umask 077
printf 'GIGA_DESK_AGENT_API_URL=%s\nGIGA_DESK_AGENT_NODE_ID=%s\nGIGA_DESK_AGENT_OIDC_TOKEN_URL=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_ID=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_SECRET=%s\n' "$API_URL" "$NODE_ID" "$TOKEN_URL" "$CLIENT_ID" "$CLIENT_SECRET" > "$config_dir/agent.env"
escaped_repositories=$(printf '%s' "$REPOSITORIES" | sed 's/[\\$"`]/\\&/g')
printf 'GIGA_DESK_WORKER_AGENT_TYPE=CodexCli\nGIGA_DESK_WORKER_REPOSITORIES="%s"\nGIGA_DESK_AGENT_POLL_INTERVAL_MS=5000\nGIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS=30000\n' "$escaped_repositories" > "$config_dir/worker.env"
chmod 600 "$config_dir/agent.env" "$config_dir/worker.env"

node_bin=$(command -v node)
cat > "$service_dir/giga-desk-codex-worker.service" <<EOF
[Unit]
Description=Giga Desk Codex worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$release_dir
Environment=PATH=$codex_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
EnvironmentFile=$config_dir/agent.env
EnvironmentFile=$config_dir/worker.env
ExecStart=$node_bin apps/codex-worker/dist/main.js
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
echo 'The authenticated worker registers Codex and the node should become Online. It will wait safely until GIGA_DESK_WORKER_REPOSITORIES maps a customer repository checkout. View logs with: journalctl --user -u giga-desk-codex-worker.service -f'
