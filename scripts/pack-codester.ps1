# Pack SN Editor for Codester (Windows)
# Creates dist-codester/SN-Editor-v1.0.0-main.zip and SN-Editor-screenshots.zip
# Excludes node_modules, .next, .git, env secrets, and local user data.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$StageParent = Join-Path $Root "dist-codester"
$Stage = Join-Path $StageParent "SN-Editor-v1.0.0"
$MainZip = Join-Path $StageParent "SN-Editor-v1.0.0-main.zip"
$ShotZip = Join-Path $StageParent "SN-Editor-screenshots.zip"

if (Test-Path $StageParent) {
  Remove-Item -Recurse -Force $StageParent
}
New-Item -ItemType Directory -Path $Stage | Out-Null

$excludeDirNames = @(
  "node_modules", ".next", ".git", ".turbo", "dist", "dist-codester",
  "coverage", "tmp-ref", "agent-transcripts", "data"
)

function ShouldSkipDir([string]$name) {
  return $excludeDirNames -contains $name
}

function Copy-Tree([string]$from, [string]$to) {
  New-Item -ItemType Directory -Path $to -Force | Out-Null
  Get-ChildItem -Force $from | ForEach-Object {
    $name = $_.Name
    if ($name -eq ".env" -or $name -eq ".env.local") { return }
    if ($_.PSIsContainer) {
      if (ShouldSkipDir $name) { return }
      if ($name -eq "apps") {
        Copy-Tree $_.FullName (Join-Path $to $name)
        return
      }
      Copy-Tree $_.FullName (Join-Path $to $name)
    } else {
      Copy-Item $_.FullName (Join-Path $to $name) -Force
    }
  }
}

Copy-Tree $Root $Stage

# Never ship local DB / Stripe keys
$webData = Join-Path $Stage "apps\web\data"
if (Test-Path $webData) {
  Remove-Item -Recurse -Force $webData
}

if (Test-Path $MainZip) { Remove-Item -Force $MainZip }
Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $MainZip -Force

$shots = Join-Path $Root "codester-assets\screenshots"
$shotStage = Join-Path $StageParent "screenshots-pack"
New-Item -ItemType Directory -Path $shotStage | Out-Null
Get-ChildItem $shots -File | Where-Object { $_.Extension -match '\.(png|jpg|jpeg)$' } | ForEach-Object {
  Copy-Item $_.FullName $shotStage
}
if (Test-Path $ShotZip) { Remove-Item -Force $ShotZip }
$shotFiles = Get-ChildItem $shotStage -File
if ($shotFiles.Count -gt 0) {
  Compress-Archive -Path (Join-Path $shotStage "*") -DestinationPath $ShotZip -Force
}

Write-Host "Main zip: $MainZip"
if (Test-Path $ShotZip) { Write-Host "Screenshots zip: $ShotZip" }
Write-Host "Preview: codester-assets\preview\sn-editor-preview.png"
Write-Host "Icon:    codester-assets\icon\sn-editor-icon.png"
