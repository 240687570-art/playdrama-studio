$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPort = if ($env:PORT) { $env:PORT } else { '8787' }
$vitePort = if ($env:VITE_PORT) { $env:VITE_PORT } else { '5177' }

$env:PORT = $apiPort
$env:HOST = if ($env:HOST) { $env:HOST } else { '127.0.0.1' }
$env:VITE_PLAYDRAMA_API_BASE = if ($env:VITE_PLAYDRAMA_API_BASE) {
  $env:VITE_PLAYDRAMA_API_BASE
} else {
  "http://127.0.0.1:$apiPort"
}

$api = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'api') -WorkingDirectory $root -WindowStyle Hidden -PassThru
$vite = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', $vitePort) -WorkingDirectory $root -WindowStyle Hidden -PassThru

Write-Host "PlayDrama API started on http://127.0.0.1:$apiPort (pid $($api.Id))"
Write-Host "PlayDrama Studio started on http://127.0.0.1:$vitePort (pid $($vite.Id))"
