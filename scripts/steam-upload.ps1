#Requires -Version 5.1
<#
.SYNOPSIS
  Upload the Electron win-unpacked folder to Steam via SteamPipe.

.USAGE
  1. Copy config.example.json to config.local.json and set depotId + steamworksSdk path.
  2. Download Steamworks SDK from the partner site (SteamPipe docs link).
  3. Run:  npm run steam:upload

  Uploads directly from release\win-unpacked (no copy to steam\content).
  First upload uses interactive Steam login (+ Steam Guard).
#>
param(
  [switch]$SkipBuild,
  [switch]$StageOnly,
  [switch]$UploadOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$configPath = Join-Path $Root "steam\config.local.json"
if (-not (Test-Path $configPath)) {
  Write-Host ""
  Write-Host "Missing steam\config.local.json" -ForegroundColor Red
  Write-Host "  Copy steam\config.example.json to steam\config.local.json"
  Write-Host "  Set depotId (Steamworks > SteamPipe > Depots) and steamworksSdk path."
  Write-Host ""
  exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$appId = [string]$config.appId
$depotId = [string]$config.depotId
$buildDescBase = [string]$config.buildDesc
$buildDesc = "$buildDescBase $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
# Optional beta branch to auto-set live. Leave empty — Steam forbids SetLive "default" via steamcmd.
$setLiveBranch = if ($config.PSObject.Properties.Name -contains "setLiveBranch") {
  [string]$config.setLiveBranch
} else {
  ""
}
$sdkRoot = [string]$config.steamworksSdk

if ($depotId -match "PASTE|YOUR") {
  Write-Host "Set depotId in steam\config.local.json (Steamworks > SteamPipe > Depots)." -ForegroundColor Red
  exit 1
}

$steamcmd = Join-Path $sdkRoot "tools\ContentBuilder\builder\steamcmd.exe"
if (-not (Test-Path $steamcmd)) {
  Write-Host "steamcmd not found at: $steamcmd" -ForegroundColor Red
  Write-Host "Download the Steamworks SDK and set steamworksSdk in config.local.json."
  exit 1
}

$winUnpacked = Join-Path $Root "release\win-unpacked"
$outputDir = Join-Path $Root "steam\output"
$generatedDir = Join-Path $Root "steam\generated"

if (-not $SkipBuild -and -not $UploadOnly) {
  Write-Host "Building Steam edition (Vite + Electron + NSIS)..." -ForegroundColor Cyan
  npm run electron:package
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path $winUnpacked)) {
  Write-Host "Missing release\win-unpacked - run: npm run electron:package" -ForegroundColor Red
  exit 1
}

$exe = Get-ChildItem $winUnpacked -Filter "*.exe" | Select-Object -First 1
if ($exe) {
  Write-Host "Upload source: release\win-unpacked\$($exe.Name)" -ForegroundColor Green
} else {
  Write-Host "Warning: no .exe in release\win-unpacked" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path $generatedDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Paths in VDF must use forward slashes (Steam requirement on all platforms).
$contentRoot = ($winUnpacked -replace "\\", "/")
$outputRoot = ($outputDir -replace "\\", "/")
$depotVdfName = "depot_build_$depotId.vdf"
$depotVdfPath = Join-Path $generatedDir $depotVdfName
$appVdfPath = Join-Path $generatedDir "app_build_$appId.vdf"

$depotVdf = @"
"DepotBuildConfig"
{
  "DepotID" "$depotId"
  "ContentRoot" "$contentRoot/"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "Recursive" "1"
  }
  "FileExclusion" "*.pdb"
}
"@
Write-Utf8NoBom $depotVdfPath $depotVdf

$appVdf = @"
"AppBuild"
{
  "AppID" "$appId"
  "Desc" "$buildDesc"
  "BuildOutput" "$outputRoot/"
  "ContentRoot" "$contentRoot/"
  "SetLive" "$setLiveBranch"
  "Depots"
  {
    "$depotId" "$depotVdfName"
  }
}
"@
Write-Utf8NoBom $appVdfPath $appVdf

Write-Host "  VDF: $appVdfPath" -ForegroundColor DarkGray

if ($StageOnly) {
  Write-Host "StageOnly - VDF written, skipped Steam upload." -ForegroundColor Yellow
  exit 0
}

Write-Host ""
Write-Host "Uploading to Steam (App $appId, Depot $depotId)..." -ForegroundColor Cyan
Write-Host "You need a Steam account with access to this app in Steamworks." -ForegroundColor DarkGray
Write-Host ""

$steamUser = $config.steamUsername
if (-not $steamUser) {
  $steamUser = Read-Host "Steam username (partner account)"
}

$builderDir = Split-Path -Parent $steamcmd
$appVdfForCmd = ($appVdfPath -replace "\\", "/")
$logPath = Join-Path $outputDir "upload.log"

Push-Location $builderDir
try {
  Write-Host "Running steamcmd..." -ForegroundColor Cyan
  Write-Host "Enter your Steam PASSWORD when prompted (input is hidden)." -ForegroundColor Yellow
  Write-Host "Then enter Steam Guard code if asked." -ForegroundColor Yellow
  Write-Host ""

  # Do not pipe steamcmd — piping breaks interactive password / Steam Guard prompts.
  Start-Transcript -Path $logPath -Append:$false | Out-Null
  try {
    & $steamcmd +login $steamUser +run_app_build $appVdfForCmd +quit
    $exitCode = $LASTEXITCODE
  } finally {
    Stop-Transcript | Out-Null
  }
} finally {
  Pop-Location
}

if ($exitCode -ne 0) {
  Write-Host ""
  Write-Host "Upload failed (exit $exitCode). Log: $logPath" -ForegroundColor Red
  exit $exitCode
}

Write-Host ""
Write-Host "Upload finished. Check Steamworks > SteamPipe > Builds." -ForegroundColor Green
if ($setLiveBranch) {
  Write-Host "Build auto-set live on branch: $setLiveBranch" -ForegroundColor Green
} else {
  Write-Host "Set the build live on branch 'default' in Steamworks > SteamPipe > Builds." -ForegroundColor Yellow
}
Write-Host "Then publish: Steamworks > Publish tab." -ForegroundColor Yellow
exit 0
