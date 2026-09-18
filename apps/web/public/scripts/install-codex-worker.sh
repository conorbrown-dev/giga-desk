#!/usr/bin/env bash
set -Eeuo pipefail
runtime=${GIGA_DESK_WORKER_AGENT_TYPE:-CodexAppServer}
case "$runtime" in CodexAppServer|CodexSdk|ClaudeAgentSdk) ;; *) echo 'Set GIGA_DESK_WORKER_AGENT_TYPE to CodexAppServer, CodexSdk, or ClaudeAgentSdk.' >&2; exit 1;; esac
if [[ "$runtime" != ClaudeAgentSdk ]] && ! command -v codex >/dev/null; then echo 'Codex must be installed and authenticated.' >&2; exit 1; fi
if [[ "$runtime" == ClaudeAgentSdk && -z "${ANTHROPIC_API_KEY:-}" ]]; then echo 'ANTHROPIC_API_KEY must be set for Claude Agent SDK.' >&2; exit 1; fi
for command in systemctl node npm curl sha256sum tar; do command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }; done
config_dir="$HOME/.config/giga-desk"; service_dir="$HOME/.config/systemd/user"; service_file="$service_dir/giga-desk-codex-worker.service"; release_root="$HOME/.local/share/giga-desk/worker"; backup_dir=$(mktemp -d); download_dir=$(mktemp -d); committed=false
rollback() { if ! "$committed"; then systemctl --user disable --now giga-desk-codex-worker.service >/dev/null 2>&1 || true; rm -f "$service_file"; rm -rf "$release_root" "$config_dir"; [[ -e "$backup_dir/service" ]] && { mkdir -p "$service_dir"; cp -a "$backup_dir/service" "$service_file"; }; [[ -d "$backup_dir/release" ]] && cp -a "$backup_dir/release" "$release_root"; [[ -d "$backup_dir/config" ]] && cp -a "$backup_dir/config" "$config_dir"; systemctl --user daemon-reload >/dev/null 2>&1 || true; [[ -e "$backup_dir/service" ]] && systemctl --user enable --now giga-desk-codex-worker.service >/dev/null 2>&1 || true; echo 'Installation failed; the prior Giga Desk worker was restored.' >&2; fi; rm -rf "$backup_dir" "$download_dir"; }
trap rollback EXIT
[[ -e "$service_file" ]] && cp -a "$service_file" "$backup_dir/service"; [[ -d "$release_root" ]] && cp -a "$release_root" "$backup_dir/release"; [[ -d "$config_dir" ]] && cp -a "$config_dir" "$backup_dir/config"
[[ -f "$config_dir/agent.env" ]] && { set -a; source "$config_dir/agent.env"; set +a; }
for name in GIGA_DESK_AGENT_API_URL GIGA_DESK_AGENT_NODE_ID GIGA_DESK_AGENT_OIDC_TOKEN_URL GIGA_DESK_AGENT_OIDC_CLIENT_ID GIGA_DESK_AGENT_OIDC_CLIENT_SECRET; do [[ -n "${!name:-}" ]] || { echo "Missing $name." >&2; exit 1; }; done
release_url=${GIGA_DESK_WORKER_RELEASE_URL:-"$(node -e 'console.log(new URL(process.argv[1]).origin)' "$GIGA_DESK_AGENT_API_URL")/releases/giga-desk-worker.tgz"}; curl --fail --silent --show-error --location "$release_url" --output "$download_dir/worker.tgz"; curl --fail --silent --show-error --location "$release_url.sha256" --output "$download_dir/worker.tgz.sha256"; expected=$(awk '{print $1}' "$download_dir/worker.tgz.sha256"); actual=$(sha256sum "$download_dir/worker.tgz" | awk '{print $1}'); [[ "$expected" == "$actual" ]] || { echo 'Worker checksum mismatch.' >&2; exit 1; }
stage="$release_root/.staging-$actual"; final="$release_root/releases/$actual"; rm -rf "$stage"; mkdir -p "$stage"; tar -xzf "$download_dir/worker.tgz" -C "$stage"; (cd "$stage" && npm install --omit=dev --no-audit --no-fund); mkdir -p "$release_root/releases"; [[ -d "$final" ]] || mv "$stage" "$final"
mkdir -p "$config_dir" "$service_dir"; umask 077; printf 'GIGA_DESK_AGENT_API_URL=%s\nGIGA_DESK_AGENT_NODE_ID=%s\nGIGA_DESK_AGENT_OIDC_TOKEN_URL=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_ID=%s\nGIGA_DESK_AGENT_OIDC_CLIENT_SECRET=%s\n%s\n' "$GIGA_DESK_AGENT_API_URL" "$GIGA_DESK_AGENT_NODE_ID" "$GIGA_DESK_AGENT_OIDC_TOKEN_URL" "$GIGA_DESK_AGENT_OIDC_CLIENT_ID" "$GIGA_DESK_AGENT_OIDC_CLIENT_SECRET" "${ANTHROPIC_API_KEY:+ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY}" > "$config_dir/agent.env"; printf 'GIGA_DESK_WORKER_AGENT_TYPE=%s\nGIGA_DESK_WORKER_MODEL_IDENTIFIER=%s\nGIGA_DESK_WORKER_REPOSITORIES=[]\nGIGA_DESK_AGENT_POLL_INTERVAL_MS=5000\nGIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS=30000\n' "$runtime" "${GIGA_DESK_WORKER_MODEL_IDENTIFIER:-}" > "$config_dir/worker.env"; chmod 600 "$config_dir/agent.env" "$config_dir/worker.env"
cat > "$service_file" <<EOF
[Unit]
Description=Giga Desk $runtime worker
After=network-online.target
[Service]
WorkingDirectory=$final
Environment=PATH=$(dirname "$(command -v codex 2>/dev/null || command -v node)"):/usr/local/bin:/usr/bin
EnvironmentFile=$config_dir/agent.env
EnvironmentFile=$config_dir/worker.env
ExecStart=$(command -v node) apps/codex-worker/dist/main.js
Restart=on-failure
RestartSec=10
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload; systemctl --user enable --now giga-desk-codex-worker.service; systemctl --user --no-pager --quiet is-active giga-desk-codex-worker.service; committed=true; echo "$runtime worker installed and active."
