@echo off
setlocal
title Upload A Dark Cave to Steam

set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "steam\config.local.json" (
  echo.
  echo  Missing steam\config.local.json
  echo.
  echo  One-time setup:
  echo    1. Copy steam\config.example.json to steam\config.local.json
  echo    2. Set depotId ^(Steamworks - SteamPipe - Depots^)
  echo    3. Set steamworksSdk ^(path to downloaded Steamworks SDK^)
  echo    4. Optional: set steamUsername to skip the username prompt
  echo.
  pause
  exit /b 1
)

echo.
echo  Building ^(if needed^) and uploading to Steam...
echo  You will be prompted for Steam password and Steam Guard.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\steam-upload.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Upload failed ^(exit %ERR%^).
) else (
  echo  Done. Set the build live in Steamworks - SteamPipe - Builds.
)
echo.
pause
exit /b %ERR%
