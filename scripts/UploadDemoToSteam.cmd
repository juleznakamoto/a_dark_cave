@echo off
setlocal
title Upload A Dark Cave Demo to Steam

set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "steam\config.demo.local.json" (
  echo.
  echo  Missing steam\config.demo.local.json
  echo.
  echo  One-time setup:
  echo    1. Copy steam\config.demo.example.json to steam\config.demo.local.json
  echo    2. Set depotId ^(Steamworks - A Dark Cave Demo - SteamPipe - Depots^)
  echo    3. Set steamworksSdk ^(path to downloaded Steamworks SDK^)
  echo    4. Paste demo App ID 4971800 into steam_appid_demo.txt
  echo    5. Optional: set steamUsername to skip the username prompt
  echo.
  pause
  exit /b 1
)

if not exist "steam_appid_demo.txt" (
  echo.
  echo  Missing steam_appid_demo.txt ^(demo App ID 4971800^).
  echo.
  pause
  exit /b 1
)

echo.
echo  Building demo ^(if needed^) and uploading to Steam...
echo  You will be prompted for Steam password and Steam Guard.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\steam-upload-demo.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Upload failed ^(exit %ERR%^).
) else (
  echo  Done. Set the build live in Steamworks - A Dark Cave Demo - SteamPipe - Builds.
)
echo.
pause
exit /b %ERR%
