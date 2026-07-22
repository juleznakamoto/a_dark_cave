#Requires -Version 5.1
<#
.SYNOPSIS
  Build and upload all three Steam editions (full, demo, playtest) in one run.

.USAGE
  Requires steam/config.local.json, config.demo.local.json, and config.playtest.local.json
  (same setup as the individual upload scripts).

  Run:  npm run steam:upload-all
  Or double-click: scripts\UploadAllToSteam.cmd

  Each edition is packaged, then copied to
  %LOCALAPPDATA%\a-dark-cave-steam\staged-{full,demo,playtest} so the shared
  release\win-unpacked folder can be reused. Staging lives outside the repo so
  IDE/antivirus file locks on app.asar do not break the copy step. All three
  SteamPipe uploads then run in a single steamcmd session (one login / Steam Guard).
#>
param(
  [switch]$SkipBuild,
  [switch]$StageOnly,
  [switch]$UploadOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
# Outside the workspace: Cursor (and similar) often lock app.asar under steam\staged-*.
$SteamStageRoot = Join-Path $env:LOCALAPPDATA "a-dark-cave-steam"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Read-SteamConfig([string]$RelativePath, [string]$Label) {
  $configPath = Join-Path $Root $RelativePath
  if (-not (Test-Path $configPath)) {
    Write-Host ""
    Write-Host "Missing $RelativePath ($Label)" -ForegroundColor Red
    Write-Host "  Set up the matching config.*.example.json first (see individual steam:*:upload scripts)."
    Write-Host ""
    exit 1
  }
  return Get-Content $configPath -Raw | ConvertFrom-Json
}

function Assert-DepotConfigured($config, [string]$ConfigLabel) {
  $appId = [string]$config.appId
  $depotId = [string]$config.depotId
  if ($appId -match "PASTE|YOUR") {
    Write-Host "Set appId in $ConfigLabel." -ForegroundColor Red
    exit 1
  }
  if ($depotId -match "PASTE|YOUR") {
    Write-Host "Set depotId in $ConfigLabel." -ForegroundColor Red
    exit 1
  }
}

function Get-SetLiveBranch($config) {
  if ($config.PSObject.Properties.Name -contains "setLiveBranch") {
    return [string]$config.setLiveBranch
  }
  return ""
}

function Stop-ProcessesUsingPath([string]$PathRoot) {
  $rootFull = [System.IO.Path]::GetFullPath($PathRoot).TrimEnd('\')
  $stopped = @()
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ForEach-Object {
    $exePath = $_.ExecutablePath
    if (-not $exePath) { return }
    try {
      $full = [System.IO.Path]::GetFullPath($exePath)
    } catch {
      return
    }
    if ($full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      Write-Host "  Stopping process locking stage: $($_.Name) (PID $($_.ProcessId))" -ForegroundColor Yellow
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
      $stopped += $_.ProcessId
    }
  }
  if ($stopped.Count -gt 0) {
    Start-Sleep -Seconds 1
  }
}

function Remove-StageDir([string]$StageDir) {
  if (-not (Test-Path $StageDir)) { return }

  Stop-ProcessesUsingPath $StageDir

  $maxAttempts = 8
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      Remove-Item $StageDir -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq $maxAttempts) {
        Write-Host ""
        Write-Host "Cannot clear stage folder (file in use):" -ForegroundColor Red
        Write-Host "  $StageDir" -ForegroundColor Red
        Write-Host "  Close 'A Dark Cave' if it is running from that folder," -ForegroundColor Yellow
        Write-Host "  close Explorer windows open on it, then re-run." -ForegroundColor Yellow
        Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkGray
        exit 1
      }
      Write-Host "  Stage folder busy (attempt $attempt/$maxAttempts), retrying..." -ForegroundColor DarkYellow
      Stop-ProcessesUsingPath $StageDir
      Start-Sleep -Seconds ([Math]::Min(2 * $attempt, 8))
    }
  }
}

function Copy-WinUnpackedToStage([string]$StageDir) {
  $source = Join-Path $Root "release\win-unpacked"
  if (-not (Test-Path $source)) {
    Write-Host "Missing release\win-unpacked after package step." -ForegroundColor Red
    exit 1
  }
  Remove-StageDir $StageDir
  New-Item -ItemType Directory -Path (Split-Path -Parent $StageDir) -Force | Out-Null
  Copy-Item $source $StageDir -Recurse -Force
  $exe = Get-ChildItem $StageDir -Filter "*.exe" | Select-Object -First 1
  if ($exe) {
    Write-Host "  Staged: $StageDir\$($exe.Name)" -ForegroundColor Green
  } else {
    Write-Host "  Warning: no .exe in $StageDir" -ForegroundColor Yellow
  }
}

function Write-SteamPipeVdfs(
  $config,
  [string]$StageDir,
  [string]$GeneratedDir,
  [string]$OutputDir
) {
  $appId = [string]$config.appId
  $depotId = [string]$config.depotId
  $buildDescBase = [string]$config.buildDesc
  $buildDesc = "$buildDescBase $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  $setLiveBranch = Get-SetLiveBranch $config

  New-Item -ItemType Directory -Path $GeneratedDir -Force | Out-Null
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

  $contentRoot = ($StageDir -replace "\\", "/")
  $outputRoot = ($OutputDir -replace "\\", "/")
  $depotVdfName = "depot_build_$depotId.vdf"
  $depotVdfPath = Join-Path $GeneratedDir $depotVdfName
  $appVdfPath = Join-Path $GeneratedDir "app_build_$appId.vdf"

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
  return $appVdfPath
}

$fullConfig = Read-SteamConfig "steam\config.local.json" "full game"
$demoConfig = Read-SteamConfig "steam\config.demo.local.json" "demo"
$playtestConfig = Read-SteamConfig "steam\config.playtest.local.json" "playtest"

Assert-DepotConfigured $fullConfig "steam\config.local.json"
Assert-DepotConfigured $demoConfig "steam\config.demo.local.json"
Assert-DepotConfigured $playtestConfig "steam\config.playtest.local.json"

$sdkRoot = [string]$fullConfig.steamworksSdk
$steamcmd = Join-Path $sdkRoot "tools\ContentBuilder\builder\steamcmd.exe"
if (-not (Test-Path $steamcmd)) {
  Write-Host "steamcmd not found at: $steamcmd" -ForegroundColor Red
  Write-Host "Download the Steamworks SDK and set steamworksSdk in steam\config.local.json."
  exit 1
}

$editions = @(
  @{
    Name = "full"
    Config = $fullConfig
    PackageCmd = "npm run electron:package"
    StageDir = (Join-Path $SteamStageRoot "staged-full")
    GeneratedDir = (Join-Path $Root "steam\generated")
    OutputDir = (Join-Path $Root "steam\output")
  },
  @{
    Name = "demo"
    Config = $demoConfig
    PackageCmd = "npm run electron:package:demo"
    StageDir = (Join-Path $SteamStageRoot "staged-demo")
    GeneratedDir = (Join-Path $Root "steam\generated-demo")
    OutputDir = (Join-Path $Root "steam\output-demo")
  },
  @{
    Name = "playtest"
    Config = $playtestConfig
    PackageCmd = "npm run electron:package:playtest"
    StageDir = (Join-Path $SteamStageRoot "staged-playtest")
    GeneratedDir = (Join-Path $Root "steam\generated-playtest")
    OutputDir = (Join-Path $Root "steam\output-playtest")
  }
)

if (-not $SkipBuild -and -not $UploadOnly) {
  foreach ($edition in $editions) {
    Write-Host ""
    Write-Host "Building Steam $($edition.Name)..." -ForegroundColor Cyan
    Invoke-Expression $edition.PackageCmd
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Copy-WinUnpackedToStage $edition.StageDir
  }
} else {
  foreach ($edition in $editions) {
    if (-not (Test-Path $edition.StageDir)) {
      Write-Host "Missing staged build: $($edition.StageDir)" -ForegroundColor Red
      Write-Host "  Run without -SkipBuild/-UploadOnly first (or use npm run steam:upload-all)." -ForegroundColor DarkGray
      exit 1
    }
    Write-Host "Using staged $($edition.Name): $($edition.StageDir)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Writing SteamPipe VDFs for all editions..." -ForegroundColor Cyan
$appVdfs = @()
foreach ($edition in $editions) {
  $appVdfs += Write-SteamPipeVdfs $edition.Config $edition.StageDir $edition.GeneratedDir $edition.OutputDir
}

if ($StageOnly) {
  Write-Host "StageOnly - VDFs written, skipped Steam upload." -ForegroundColor Yellow
  exit 0
}

$steamUser = $null
foreach ($cfg in @($fullConfig, $demoConfig, $playtestConfig)) {
  if ($cfg.PSObject.Properties.Name -contains "steamUsername" -and $cfg.steamUsername) {
    $steamUser = [string]$cfg.steamUsername
    break
  }
}
if (-not $steamUser) {
  $steamUser = Read-Host "Steam username (partner account)"
}

$builderDir = Split-Path -Parent $steamcmd
$logPath = Join-Path $Root "steam\output\upload-all.log"
New-Item -ItemType Directory -Path (Split-Path -Parent $logPath) -Force | Out-Null

Write-Host ""
Write-Host "Uploading all three Steam editions in one steamcmd session..." -ForegroundColor Cyan
Write-Host "  Full $($fullConfig.appId) / demo $($demoConfig.appId) / playtest $($playtestConfig.appId)" -ForegroundColor DarkGray
Write-Host "Enter your Steam PASSWORD when prompted (input is hidden)." -ForegroundColor Yellow
Write-Host "Then enter Steam Guard code if asked." -ForegroundColor Yellow
Write-Host ""

$steamArgs = @("+login", $steamUser)
foreach ($appVdf in $appVdfs) {
  $steamArgs += "+run_app_build"
  $steamArgs += ($appVdf -replace "\\", "/")
}
$steamArgs += "+quit"

Push-Location $builderDir
try {
  Start-Transcript -Path $logPath -Append:$false | Out-Null
  try {
    & $steamcmd @steamArgs
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
Write-Host "All three uploads finished." -ForegroundColor Green
Write-Host "Set each build live on branch 'default' in Steamworks > SteamPipe > Builds, then Publish." -ForegroundColor Yellow
Write-Host "  Full / Demo / Playtest apps separately." -ForegroundColor DarkGray
Write-Host "Log: $logPath" -ForegroundColor DarkGray
exit 0
