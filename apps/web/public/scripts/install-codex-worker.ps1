$ErrorActionPreference = 'Stop'

function ConvertTo-PowerShellSingleQuotedText([string]$Value) {
  return $Value.Replace("'", "''")
}

$codex = Get-Command codex -ErrorAction SilentlyContinue
if ($null -eq $codex) { throw 'Codex is not installed or is not on PATH. Install it, then run this script again.' }
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) { throw 'Node.js 22 or later is required to run the worker.' }

$configDir = Join-Path $env:USERPROFILE '.config/giga-desk'
$agentFile = Join-Path $configDir 'agent.env.ps1'
$workerFile = Join-Path $configDir 'worker.env.ps1'
if (Test-Path $agentFile) { . $agentFile }
if (Test-Path $workerFile) { . $workerFile }
$missing = @('GIGA_DESK_AGENT_API_URL', 'GIGA_DESK_AGENT_NODE_ID', 'GIGA_DESK_AGENT_OIDC_TOKEN_URL', 'GIGA_DESK_AGENT_OIDC_CLIENT_ID', 'GIGA_DESK_AGENT_OIDC_CLIENT_SECRET') | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) }
if ($missing.Count -gt 0) { throw "Worker identity is not configured. Provide the protected agent.env.ps1 file or set: $($missing -join ', ')" }
$apiUrl = $env:GIGA_DESK_AGENT_API_URL
$nodeId = $env:GIGA_DESK_AGENT_NODE_ID
$tokenUrl = $env:GIGA_DESK_AGENT_OIDC_TOKEN_URL
$clientId = $env:GIGA_DESK_AGENT_OIDC_CLIENT_ID
$clientSecret = $env:GIGA_DESK_AGENT_OIDC_CLIENT_SECRET
$repositories = if ([string]::IsNullOrWhiteSpace($env:GIGA_DESK_WORKER_REPOSITORIES)) { '[]' } else { $env:GIGA_DESK_WORKER_REPOSITORIES }
$releaseUrl = $env:GIGA_DESK_WORKER_RELEASE_URL
if ([string]::IsNullOrWhiteSpace($releaseUrl)) { $releaseUrl = "$(([uri]$apiUrl).GetLeftPart([UriPartial]::Authority))/releases/giga-desk-worker.tgz" }
$downloadDirectory = Join-Path ([IO.Path]::GetTempPath()) "giga-desk-worker-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $downloadDirectory | Out-Null
try {
  $archive = Join-Path $downloadDirectory 'worker.tgz'
  Invoke-WebRequest -Uri $releaseUrl -OutFile $archive
  Invoke-WebRequest -Uri "$releaseUrl.sha256" -OutFile "$archive.sha256"
  $expectedHash = (Get-Content "$archive.sha256" -Raw).Split([char[]]' ')[0]
  $actualHash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($expectedHash.ToLowerInvariant() -ne $actualHash) { throw 'The downloaded worker bundle checksum does not match.' }
  $releaseDirectory = Join-Path $env:LOCALAPPDATA "GigaDesk\worker\releases\$actualHash"
  if (-not (Test-Path $releaseDirectory)) { New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null; & tar -xzf $archive -C $releaseDirectory }
} finally { Remove-Item -Recurse -Force $downloadDirectory }
$safeApiUrl = ConvertTo-PowerShellSingleQuotedText $apiUrl
$safeNodeId = ConvertTo-PowerShellSingleQuotedText $nodeId
$safeTokenUrl = ConvertTo-PowerShellSingleQuotedText $tokenUrl
$safeClientId = ConvertTo-PowerShellSingleQuotedText $clientId
$safeClientSecret = ConvertTo-PowerShellSingleQuotedText $clientSecret
$safeRepositories = ConvertTo-PowerShellSingleQuotedText $repositories

$taskDir = Join-Path $configDir 'task'
New-Item -ItemType Directory -Force -Path $taskDir | Out-Null
$runnerFile = Join-Path $taskDir 'run-worker.ps1'
$utf8 = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($agentFile, "`$env:GIGA_DESK_AGENT_API_URL = '$safeApiUrl'`n`$env:GIGA_DESK_AGENT_NODE_ID = '$safeNodeId'`n`$env:GIGA_DESK_AGENT_OIDC_TOKEN_URL = '$safeTokenUrl'`n`$env:GIGA_DESK_AGENT_OIDC_CLIENT_ID = '$safeClientId'`n`$env:GIGA_DESK_AGENT_OIDC_CLIENT_SECRET = '$safeClientSecret'`n", $utf8)
[IO.File]::WriteAllText($workerFile, "`$env:GIGA_DESK_WORKER_AGENT_TYPE = 'CodexCli'`n`$env:GIGA_DESK_WORKER_REPOSITORIES = '$safeRepositories'`n`$env:GIGA_DESK_AGENT_POLL_INTERVAL_MS = '5000'`n`$env:GIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS = '30000'`n", $utf8)
[IO.File]::WriteAllText($runnerFile, @'
$ErrorActionPreference = 'Stop'
. "$env:USERPROFILE\.config\giga-desk\agent.env.ps1"
. "$env:USERPROFILE\.config\giga-desk\worker.env.ps1"
$env:Path = '__CODEX_DIRECTORY__;' + $env:Path
Set-Location -LiteralPath '__RELEASE_DIRECTORY__'
& '__NODE_PATH__' apps/codex-worker/dist/main.js
'@.Replace('__CODEX_DIRECTORY__', (Split-Path -Parent $codex.Source).Replace("'", "''")).Replace('__RELEASE_DIRECTORY__', $releaseDirectory.Replace("'", "''")).Replace('__NODE_PATH__', $node.Source.Replace("'", "''")), $utf8)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $configDir /inheritance:r /grant:r "${identity}:(OI)(CI)F" | Out-Null
icacls $agentFile /inheritance:r /grant:r "${identity}:F" | Out-Null
icacls $workerFile /inheritance:r /grant:r "${identity}:F" | Out-Null
icacls $runnerFile /inheritance:r /grant:r "${identity}:F" | Out-Null
$action = New-ScheduledTaskAction -Execute "$PSHOME\powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerFile`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'Giga Desk Codex Worker' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName 'Giga Desk Codex Worker'
Get-ScheduledTask -TaskName 'Giga Desk Codex Worker' | Format-List TaskName,State
Write-Host 'The authenticated worker registers Codex on startup. It waits safely until customer repositories are mapped.'
