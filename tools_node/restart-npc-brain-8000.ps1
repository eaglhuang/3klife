param(
  [ValidateSet("status", "health", "start", "stop", "restart")]
  [string]$Command = "restart",
  [int]$Port = 8000,
  [string]$HostAddress = "127.0.0.1",
  [int]$StartupTimeoutSeconds = 10
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcher = Join-Path $scriptDir "restart-npc-brain-8000.js"

& node $launcher $Command --port $Port --host $HostAddress --timeout-ms ($StartupTimeoutSeconds * 1000)
exit $LASTEXITCODE
