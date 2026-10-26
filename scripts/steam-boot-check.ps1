#Requires -Version 5.1
<#
.SYNOPSIS
  Launch a packaged Steam build, confirm its game window comes up, then close it.

.USAGE
  Dot-sourced by the Steam upload scripts before steamcmd.
  Standalone: powershell -File scripts\steam-boot-check.ps1 -BuildDir release\win-unpacked -Label "full game"
#>
param(
  [string]$BuildDir,
  [string]$Label = "Steam",
  [switch]$Skip
)

$script:AdcBootWindowTimeoutSec = 60
$script:AdcBootQuitTimeoutSec = 20

if (-not ("AdcBootNative" -as [type])) {
  Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AdcBootNative {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public const int SW_SHOW = 5;
  public const uint WM_CLOSE = 0x0010;
}
"@
}

# Kept alive for the process lifetime. EnumWindows callbacks are collected
# mid-call if the delegate is only a local variable.
$script:AdcBootPidSet = $null
$script:AdcBootBest = $null
$script:AdcBootEnum = [AdcBootNative+EnumProc]{
  param($hWnd, $lParam)
  if (-not $script:AdcBootPidSet) { return $true }
  $procId = [uint32]0
  [void][AdcBootNative]::GetWindowThreadProcessId($hWnd, [ref]$procId)
  if (-not $script:AdcBootPidSet.Contains($procId)) { return $true }

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][AdcBootNative]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  $title = $titleBuilder.ToString()
  # BrowserWindow starts as "A Dark Cave" / "A Dark Cave Demo". The loaded page
  # replaces that with the HTML title ("A Dark Cave - ...").
  if ($title -notlike "A Dark Cave -*") { return $true }

  $rect = New-Object AdcBootNative+RECT
  [void][AdcBootNative]::GetWindowRect($hWnd, [ref]$rect)
  $area = [Math]::Max(0, $rect.Right - $rect.Left) * [Math]::Max(0, $rect.Bottom - $rect.Top)
  if ($area -lt 10000) { return $true }

  $visible = [AdcBootNative]::IsWindowVisible($hWnd)
  $candidate = [pscustomobject]@{
    Hwnd = $hWnd
    Title = $title
    Visible = $visible
    Area = $area
  }
  $best = $script:AdcBootBest
  if (-not $best -or ($visible -and -not $best.Visible) -or ($visible -eq $best.Visible -and $area -gt $best.Area)) {
    $script:AdcBootBest = $candidate
  }
  return $true
}

function Get-AdcBootDescendantIds([int]$RootId) {
  $children = @{}
  foreach ($proc in Get-CimInstance Win32_Process) {
    $parent = [int]$proc.ParentProcessId
    if (-not $children.ContainsKey($parent)) {
      $children[$parent] = New-Object System.Collections.Generic.List[int]
    }
    $children[$parent].Add([int]$proc.ProcessId)
  }

  $ids = New-Object System.Collections.Generic.List[int]
  $stack = New-Object System.Collections.Generic.Stack[int]
  $stack.Push($RootId)
  while ($stack.Count -gt 0) {
    $id = $stack.Pop()
    $ids.Add($id)
    if ($children.ContainsKey($id)) {
      foreach ($child in $children[$id]) { $stack.Push($child) }
    }
  }
  return $ids
}

function Find-AdcBootGameWindow([int]$RootId) {
  $pidSet = [System.Collections.Generic.HashSet[uint32]]::new()
  foreach ($id in Get-AdcBootDescendantIds $RootId) {
    [void]$pidSet.Add([uint32]$id)
  }
  $script:AdcBootPidSet = $pidSet
  $script:AdcBootBest = $null
  [void][AdcBootNative]::EnumWindows($script:AdcBootEnum, [IntPtr]::Zero)
  $found = $script:AdcBootBest
  if (-not $found) { return $null }
  if (-not $found.Visible) {
    [void][AdcBootNative]::ShowWindow($found.Hwnd, [AdcBootNative]::SW_SHOW)
    Start-Sleep -Milliseconds 400
    $found.Visible = [AdcBootNative]::IsWindowVisible($found.Hwnd)
  }
  if (-not $found.Visible) { return $null }
  return $found
}

function Stop-AdcBootTree {
  param(
    [System.Diagnostics.Process]$Root,
    [IntPtr]$Hwnd = [IntPtr]::Zero
  )
  if (-not $Root) { return }
  try { $Root.Refresh() } catch { return }
  if ($Root.HasExited) { return }

  if ($Hwnd -ne [IntPtr]::Zero) {
    [void][AdcBootNative]::PostMessage($Hwnd, [AdcBootNative]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
  }

  $deadline = (Get-Date).AddSeconds($script:AdcBootQuitTimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try { $Root.Refresh() } catch { return }
    if ($Root.HasExited) { return }
    Start-Sleep -Milliseconds 400
  }

  & taskkill.exe /PID $Root.Id /T /F *> $null
  $killDeadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $killDeadline) {
    try { $Root.Refresh() } catch { return }
    if ($Root.HasExited) { return }
    Start-Sleep -Milliseconds 300
  }
}

function Invoke-SteamBootCheck {
  param(
    [Parameter(Mandatory = $true)][string]$BuildDir,
    [string]$Label = "Steam",
    [switch]$Skip
  )

  if ($Skip) {
    Write-Host "Boot check skipped ($Label)." -ForegroundColor Yellow
    return $true
  }

  $exe = Join-Path $BuildDir "A Dark Cave.exe"
  if (-not (Test-Path -LiteralPath $exe)) {
    Write-Host "Boot check failed ($Label): missing $exe" -ForegroundColor Red
    return $false
  }

  $already = @(Get-Process -Name "A Dark Cave" -ErrorAction SilentlyContinue)
  if ($already.Count -gt 0) {
    $pids = ($already | ForEach-Object { $_.Id }) -join ", "
    Write-Host "Boot check failed ($Label): A Dark Cave is already running (PID $pids)." -ForegroundColor Red
    Write-Host "Close it, then upload again." -ForegroundColor Yellow
    return $false
  }

  Write-Host ""
  Write-Host "Boot check ($Label): launching $exe" -ForegroundColor Cyan
  Write-Host "The game window will open, then close." -ForegroundColor DarkGray

  $root = $null
  $window = $null
  try {
    $root = Start-Process -FilePath $exe -WorkingDirectory $BuildDir -PassThru
    $deadline = (Get-Date).AddSeconds($script:AdcBootWindowTimeoutSec)
    while ((Get-Date) -lt $deadline) {
      try { $root.Refresh() } catch { break }
      if ($root.HasExited) { break }
      $window = Find-AdcBootGameWindow $root.Id
      if ($window) { break }
      Start-Sleep -Milliseconds 500
    }
  } catch {
    Write-Host "Boot check failed ($Label): $($_.Exception.Message)" -ForegroundColor Red
    return $false
  } finally {
    $hwnd = [IntPtr]::Zero
    if ($window) { $hwnd = $window.Hwnd }
    if ($root) { Stop-AdcBootTree -Root $root -Hwnd $hwnd }
  }

  if ($window) {
    Write-Host "Boot check passed ($Label): $($window.Title)" -ForegroundColor Green
    return $true
  }

  $exitNote = ""
  if ($root) {
    try {
      $root.Refresh()
      if ($root.HasExited) { $exitNote = " (process exit $($root.ExitCode))" }
    } catch { }
  }
  Write-Host "Boot check failed ($Label): the game window did not appear within $($script:AdcBootWindowTimeoutSec)s$exitNote." -ForegroundColor Red
  return $false
}

if ($MyInvocation.InvocationName -ne ".") {
  if (-not $BuildDir) {
    Write-Host "Missing -BuildDir (folder that contains A Dark Cave.exe)." -ForegroundColor Red
    exit 1
  }
  $passed = Invoke-SteamBootCheck -BuildDir $BuildDir -Label $Label -Skip:$Skip
  exit $(if ($passed) { 0 } else { 1 })
}
