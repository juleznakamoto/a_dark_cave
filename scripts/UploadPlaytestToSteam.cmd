@echo off
setlocal
title Upload A Dark Cave Playtest to Steam

set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "steam\config.playtest.local.json" (
  echo.
  echo  Missing steam\config.playtest.local.json
  echo.
  echo  One-time setup:
  echo    1. Copy steam\config.playtest.example.json to steam\config.playtest.local.json
  echo    2. Set depotId ^(Steamworks - A Dark Cave Playtest - SteamPipe - Depots^)
  echo    3. Set steamworksSdk ^(path to downloaded Steamworks SDK^)
  echo    4. Paste playtest App ID into steam_appid_playtest.txt
  echo    5. Optional: set steamUsername to skip the username prompt
  echo.
  pause
  exit /b 1
)

if not exist "steam_appid_playtest.txt" (
  echo.
  echo  Missing steam_appid_playtest.txt ^(playtest App ID^).
  echo.
  pause
  exit /b 1
)

echo.
echo  Building playtest ^(if needed^) and uploading to Steam...
echo  You will be prompted for Steam password and Steam Guard.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\steam-upload-playtest.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Upload failed ^(exit %ERR%^).
) else (
  echo  Done. Set the build live in Steamworks - A Dark Cave Playtest - SteamPipe - Builds.
)
echo.
pause
exit /b %ERR%
