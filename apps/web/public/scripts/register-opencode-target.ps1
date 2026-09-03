$ErrorActionPreference = 'Stop'

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$databaseUrl = Read-SecretText 'Giga Desk API database URL'
$agentName = Read-Host 'OpenCode agent name [MIRIAM]'
if ([string]::IsNullOrWhiteSpace($agentName)) { $agentName = 'MIRIAM' }
$model = Read-Host 'OpenCode provider/model [ollama/qwen3-coder-next:q4_K_M]'
if ([string]::IsNullOrWhiteSpace($model)) { $model = 'ollama/qwen3-coder-next:q4_K_M' }

if (-not (Test-Path 'package.json') -or -not (Test-Path 'apps/api')) {
  throw 'Run this script from the Giga Desk repository checkout.'
}
if (-not (Test-Path 'node_modules')) { npm ci }
npm run build -w @giga-desk/api
$env:DATABASE_URL = $databaseUrl
try { npm run target:opencode -w @giga-desk/api -- $agentName $model }
finally { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
Write-Host 'Copy the printed execution node ID into the worker setup script.'
