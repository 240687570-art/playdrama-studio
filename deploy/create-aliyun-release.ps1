$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ReleaseRoot = Join-Path $Root 'output\release'
$Stage = Join-Path $ReleaseRoot 'playdrama-studio-aliyun'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Archive = Join-Path $ReleaseRoot "playdrama-studio-aliyun-$Stamp.zip"

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
New-Item -ItemType Directory -Force -Path $ReleaseRoot | Out-Null

if (Test-Path -LiteralPath $Stage) {
  $resolvedStage = (Resolve-Path -LiteralPath $Stage).Path
  if (-not $resolvedStage.StartsWith((Resolve-Path -LiteralPath $ReleaseRoot).Path)) {
    throw "Refusing to remove unexpected staging path: $resolvedStage"
  }
  Remove-Item -LiteralPath $Stage -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $Stage | Out-Null

$files = @(
  '.dockerignore',
  '.env.example',
  '.gitignore',
  'Dockerfile',
  'README.md',
  'eslint.config.js',
  'handoff-index.json',
  'index.html',
  'package-lock.json',
  'package.json',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts'
)

$dirs = @(
  'deploy',
  'docs',
  'public',
  'server',
  'src'
)

foreach ($file in $files) {
  $source = Join-Path $Root $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $Stage $file) -Force
  }
}

foreach ($dir in $dirs) {
  $source = Join-Path $Root $dir
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $Stage $dir) -Recurse -Force
  }
}

Get-ChildItem -LiteralPath $Stage -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object {
    ($_.Name -match '^\.env($|\.)' -and $_.Name -ne '.env.example') -or
    $_.Name -like '*.local' -or
    $_.Name -like '*.log'
  } |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
  }

$localJsonDatabase = Join-Path $Stage 'server\data\playdrama-db.json'
if (Test-Path -LiteralPath $localJsonDatabase) {
  Remove-Item -LiteralPath $localJsonDatabase -Force
}

if (Test-Path -LiteralPath $Archive) {
  Remove-Item -LiteralPath $Archive -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$packageRootName = Split-Path -Leaf $Stage
$zip = [System.IO.Compression.ZipFile]::Open($Archive, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $Stage -Recurse -Force -File | ForEach-Object {
    $relative = $_.FullName.Substring($Stage.Length).TrimStart('\', '/')
    $entryName = "$packageRootName/$relative" -replace '\\', '/'
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Host "Created $Archive"
