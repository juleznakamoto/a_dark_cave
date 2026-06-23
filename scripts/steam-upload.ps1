#Requires -Version 5.1
<#
.SYNOPSIS
  Stage the Electron win-unpacked folder and upload to Steam via SteamPipe.

.USAGE
  1. Copy config.example.json to config.local.json and set depotId + steamworksSdk path.
  2. Download Steamworks SDK from the partner site (SteamPipe docs link).
  3. Run:  npm run steam:upload

  First upload uses interactive Steam login (+ Steam Guard). Later runs reuse the session.
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

function Get-GameLockProcesses() {
  Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ProcessName -like "*Dark Cave*" -or $_.ProcessName -eq "electron" }
}

function Clear-DirectoryWithRetry([string]$Path, [int]$MaxAttempts = 5) {
  if (-not (Test-Path $Path)) { return }

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      Remove-Item $Path -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq $MaxAttempts) {
        $locked = Get-GameLockProcesses
        Write-Host ""
        Write-Host "Could not clear $Path - files are in use." -ForegroundColor Red
        Write-Host "Close A Dark Cave / Electron, then run again." -ForegroundColor Yellow
        if ($locked) {
          Write-Host "Running processes:" -ForegroundColor Yellow
          $locked | ForEach-Object { Write-Host "  - $($_.ProcessName) (pid $($_.Id))" }
        }
        Write-Host ""
        throw
      }
      Write-Host "  Files locked - close the game if it is running. Retry $attempt/$MaxAttempts ..." -ForegroundColor Yellow
      Start-Sleep -Seconds 2
    }
  }
}

function Stage-WinUnpacked([string]$Source, [string]$Destination) {
  Write-Host "Staging win-unpacked to steam\content ..." -ForegroundColor Cyan
  Clear-DirectoryWithRetry $Destination
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
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
$buildDesc = [string]$config.buildDesc
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
$contentDir = Join-Path $Root "steam\content"
$outputDir = Join-Path $Root "steam\output"
$generatedDir = Join-Path $Root "steam\generated"

if (-not $SkipBuild -and -not $UploadOnly) {
  Write-Host "Building Steam edition (Vite + Electron + NSIS)..." -ForegroundColor Cyan
  npm run electron:package
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if ($UploadOnly) {
  if (-not (Test-Path $winUnpacked)) {
    Write-Host "Missing release\win-unpacked - run: npm run electron:package" -ForegroundColor Red
    exit 1
  }
  Stage-WinUnpacked $winUnpacked $contentDir
  $exe = Get-ChildItem $contentDir -Filter "*.exe" | Select-Object -First 1
  if ($exe) {
    Write-Host "  Game executable: $($exe.Name)" -ForegroundColor Green
  }
} elseif (-not $SkipBuild -or -not (Test-Path $contentDir)) {
  if (-not (Test-Path $winUnpacked)) {
    Write-Host "Missing release\win-unpacked - run: npm run electron:package" -ForegroundColor Red
    exit 1
  }

  Stage-WinUnpacked $winUnpacked $contentDir

  $exe = Get-ChildItem $contentDir -Filter "*.exe" | Select-Object -First 1
  if ($exe) {
    Write-Host "  Game executable: $($exe.Name)" -ForegroundColor Green
  } else {
    Write-Host "  Warning: no .exe found in staged content." -ForegroundColor Yellow
  }
} elseif (-not (Test-Path $contentDir)) {
  Write-Host "Missing steam\content - run without -UploadOnly first." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Using existing steam\content (SkipBuild)." -ForegroundColor DarkGray
}

New-Item -ItemType Directory -Path $generatedDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Paths in VDF must use forward slashes (Steam requirement on all platforms).
$contentRoot = ($contentDir -replace "\\", "/")
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
  "Depots"
  {
    "$depotId" "$depotVdfName"
  }
}
"@
Write-Utf8NoBom $appVdfPath $appVdf

Write-Host "  VDF: $appVdfPath" -ForegroundColor DarkGray

if ($StageOnly) {
  Write-Host "StageOnly - skipped Steam upload." -ForegroundColor Yellow
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
  Write-Host "Running steamcmd (password + Steam Guard prompted below)..." -ForegroundColor Cyan
  & $steamcmd +login $steamUser +run_app_build $appVdfForCmd +quit *>&1 | Tee-Object -FilePath $logPath
  $exitCode = $LASTEXITCODE
} finally {
  Pop-Location
}

if ($exitCode -ne 0) {
  Write-Host ""
  Write-Host "Upload failed (exit $exitCode). Log: $logPath" -ForegroundColor Red
  exit $exitCode
}

Write-Host ""
Write-Host "Upload finished. Check Steamworks > SteamPipe > Ihre Builds." -ForegroundColor Green
Write-Host "Then publish: Steamworks > Veroeffentlichen (Publish tab)." -ForegroundColor Yellow
exit 0
