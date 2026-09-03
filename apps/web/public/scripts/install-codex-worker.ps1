$ErrorActionPreference = 'Stop'

function Read-SecretText([string]$Prompt) {
  $secure = Read-Host -Prompt $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function ConvertTo-PowerShellSingleQuotedText([string]$Value) {
  return $Value.Replace("'", "''")
}

$codex = Get-Command codex -ErrorAction SilentlyContinue
if ($null -eq $codex) { throw 'Codex is not installed or is not on PATH. Install it, then run this script again.' }
$checkout = Read-Host "Giga Desk checkout [$((Get-Location).Path)]"
if ([string]::IsNullOrWhiteSpace($checkout)) { $checkout = (Get-Location).Path }
$checkout = (Resolve-Path $checkout).Path
if (-not (Test-Path (Join-Path $checkout 'package.json')) -or -not (Test-Path (Join-Path $checkout 'apps/codex-worker'))) {
  throw 'The checkout must contain the Giga Desk package.json and apps/codex-worker.'
}
if (-not (Test-Path (Join-Path $checkout 'node_modules'))) { Push-Location $checkout; npm ci; Pop-Location }

$apiUrl = Read-Host 'Giga Desk worker API URL'
$nodeId = Read-Host 'Execution node ID'
$tokenUrl = Read-Host 'OIDC token URL'
$clientId = Read-Host 'OIDC client ID'
$clientSecret = Read-SecretText 'OIDC client secret'
$repositories = Read-Host 'Project repository map as JSON'
if ([string]::IsNullOrWhiteSpace($repositories)) { throw 'A repository map is required.' }
$safeApiUrl = ConvertTo-PowerShellSingleQuotedText $apiUrl
$safeNodeId = ConvertTo-PowerShellSingleQuotedText $nodeId
$safeTokenUrl = ConvertTo-PowerShellSingleQuotedText $tokenUrl
$safeClientId = ConvertTo-PowerShellSingleQuotedText $clientId
$safeClientSecret = ConvertTo-PowerShellSingleQuotedText $clientSecret
$safeRepositories = ConvertTo-PowerShellSingleQuotedText $repositories

$configDir = Join-Path $env:USERPROFILE '.config/giga-desk'
$taskDir = Join-Path $configDir 'task'
New-Item -ItemType Directory -Force -Path $taskDir | Out-Null
$agentFile = Join-Path $configDir 'agent.env.ps1'
$workerFile = Join-Path $configDir 'worker.env.ps1'
$runnerFile = Join-Path $taskDir 'run-worker.ps1'
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($agentFile, "`$env:GIGA_DESK_AGENT_API_URL = '$safeApiUrl'`n`$env:GIGA_DESK_AGENT_NODE_ID = '$safeNodeId'`n`$env:GIGA_DESK_AGENT_OIDC_TOKEN_URL = '$safeTokenUrl'`n`$env:GIGA_DESK_AGENT_OIDC_CLIENT_ID = '$safeClientId'`n`$env:GIGA_DESK_AGENT_OIDC_CLIENT_SECRET = '$safeClientSecret'`n", $utf8)
[IO.File]::WriteAllText($workerFile, "`$env:GIGA_DESK_WORKER_AGENT_TYPE = 'CodexCli'`n`$env:GIGA_DESK_WORKER_REPOSITORIES = '$safeRepositories'`n`$env:GIGA_DESK_AGENT_POLL_INTERVAL_MS = '5000'`n`$env:GIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS = '30000'`n", $utf8)
[IO.File]::WriteAllText($runnerFile, @'
$ErrorActionPreference = 'Stop'
. "$env:USERPROFILE\.config\giga-desk\agent.env.ps1"
. "$env:USERPROFILE\.config\giga-desk\worker.env.ps1"
$env:Path = '__CODEX_DIRECTORY__;' + $env:Path
Set-Location -LiteralPath '__CHECKOUT__'
npm run start -w @giga-desk/codex-worker
'@.Replace('__CODEX_DIRECTORY__', (Split-Path -Parent $codex.Source).Replace("'", "''")).Replace('__CHECKOUT__', $checkout.Replace("'", "''")), $utf8)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $configDir /inheritance:r /grant:r "${identity}:(OI)(CI)F" | Out-Null
icacls $agentFile /inheritance:r /grant:r "${identity}:F" | Out-Null
icacls $workerFile /inheritance:r /grant:r "${identity}:F" | Out-Null
icacls $runnerFile /inheritance:r /grant:r "${identity}:F" | Out-Null
Push-Location $checkout
try { npm run build -w @giga-desk/agent-client; npm run build -w @giga-desk/codex-worker }
finally { Pop-Location }

$action = New-ScheduledTaskAction -Execute "$PSHOME\powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerFile`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Giga Desk Codex Worker' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName 'Giga Desk Codex Worker'
Get-ScheduledTask -TaskName 'Giga Desk Codex Worker' | Format-List TaskName,State
Write-Host 'The authenticated worker registers Codex on startup. The node and agent should become visible in Giga Desk.'
