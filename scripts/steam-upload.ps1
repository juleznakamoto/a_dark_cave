#Requires -Version 5.1
<#
.SYNOPSIS
  Stage the Electron win-unpacked folder and upload to Steam via SteamPipe.

.USAGE
  1. Copy config.example.json → config.local.json and set depotId + steamworksSdk path.
  2. Download Steamworks SDK from the partner site (SteamPipe docs link).
  3. Run:  npm run steam:upload

  First upload uses interactive Steam login (+ Steam Guard). Later runs reuse the session.
#>
param(
  [switch]$SkipBuild,
  [switch]$StageOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$configPath = Join-Path $Root "steam\config.local.json"
if (-not (Test-Path $configPath)) {
  Write-Host ""
  Write-Host "Missing steam\config.local.json" -ForegroundColor Red
  Write-Host "  Copy steam\config.example.json → steam\config.local.json"
  Write-Host "  Set depotId (Steamworks → SteamPipe → Depots) and steamworksSdk path."
  Write-Host ""
  exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$appId = [string]$config.appId
$depotId = [string]$config.depotId
$buildDesc = [string]$config.buildDesc
$sdkRoot = [string]$config.steamworksSdk

if ($depotId -match "PASTE|YOUR") {
  Write-Host "Set depotId in steam\config.local.json (Steamworks → SteamPipe → Depots)." -ForegroundColor Red
  exit 1
}

$steamcmd = Join-Path $sdkRoot "tools\ContentBuilder\builder\steamcmd.exe"
if (-not (Test-Path $steamcmd)) {
  Write-Host "steamcmd not found at: $steamcmd" -ForegroundColor Red
  Write-Host "Download the Steamworks SDK and set steamworksSdk in config.local.json."
  exit 1
}

$winUnpacked = Join-Path $Root "release\win-unpacked"
$contentDir = Join-Path $Root "steam\content"
$outputDir = Join-Path $Root "steam\output"
$generatedDir = Join-Path $Root "steam\generated"

if (-not $SkipBuild) {
  Write-Host "Building Steam edition (Vite + Electron + NSIS)..." -ForegroundColor Cyan
  npm run electron:package
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path $winUnpacked)) {
  Write-Host "Missing release\win-unpacked — run: npm run electron:package" -ForegroundColor Red
  exit 1
}

Write-Host "Staging win-unpacked → steam\content ..." -ForegroundColor Cyan
if (Test-Path $contentDir) { Remove-Item $contentDir -Recurse -Force }
New-Item -ItemType Directory -Path $contentDir -Force | Out-Null
Copy-Item -Path (Join-Path $winUnpacked "*") -Destination $contentDir -Recurse -Force

$exe = Get-ChildItem $contentDir -Filter "*.exe" | Select-Object -First 1
if ($exe) {
  Write-Host "  Game executable: $($exe.Name)" -ForegroundColor Green
} else {
  Write-Host "  Warning: no .exe found in staged content." -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path $generatedDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Paths in VDF must use forward slashes (Steam requirement on all platforms).
$contentRoot = ($contentDir -replace "\\", "/")
$outputRoot = ($outputDir -replace "\\", "/")
$depotVdfName = "depot_build_$depotId.vdf"
$depotVdfPath = Join-Path $generatedDir $depotVdfName
$appVdfPath = Join-Path $generatedDir "app_build_$appId.vdf"

@'
"DepotBuildConfig"
{
  "DepotID" "{DEPOT_ID}"
  "ContentRoot" "{CONTENT_ROOT}/"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "Recursive" "1"
  }
  "FileExclusion" "*.pdb"
}
'@ -replace '\{DEPOT_ID\}', $depotId -replace '\{CONTENT_ROOT\}', $contentRoot |
  Set-Content -Path $depotVdfPath -Encoding UTF8

@'
"AppBuild"
{
  "AppID" "{APP_ID}"
  "Desc" "{BUILD_DESC}"
  "BuildOutput" "{OUTPUT_ROOT}/"
  "ContentRoot" "{CONTENT_ROOT}/"
  "Depots"
  {
    "{DEPOT_ID}" "{DEPOT_VDF}"
  }
}
'@ -replace '\{APP_ID\}', $appId `
   -replace '\{BUILD_DESC\}', $buildDesc `
   -replace '\{OUTPUT_ROOT\}', $outputRoot `
   -replace '\{CONTENT_ROOT\}', $contentRoot `
   -replace '\{DEPOT_ID\}', $depotId `
   -replace '\{DEPOT_VDF\}', ($depotVdfName -replace "\\", "/") |
  Set-Content -Path $appVdfPath -Encoding UTF8

Write-Host "  VDF: $appVdfPath" -ForegroundColor DarkGray

if ($StageOnly) {
  Write-Host "StageOnly — skipped Steam upload." -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Uploading to Steam (App $appId, Depot $depotId)..." -ForegroundColor Cyan
Write-Host "Log in when prompted (Steam Guard if enabled)." -ForegroundColor DarkGray
Write-Host ""

$appVdfForCmd = ($appVdfPath -replace "\\", "/")
& $steamcmd "+login" "+run_app_build" $appVdfForCmd "+quit"
exit $LASTEXITCODE
