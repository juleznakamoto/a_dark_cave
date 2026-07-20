@echo off
setlocal
title Upload All Steam Editions (Full + Demo + Playtest)

set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "steam\config.local.json" (
  echo.
  echo  Missing steam\config.local.json ^(full game^)
  echo  Copy steam\config.example.json and set depotId + steamworksSdk.
  echo.
  pause
  exit /b 1
)

if not exist "steam\config.demo.local.json" (
  echo.
  echo  Missing steam\config.demo.local.json
  echo  Copy steam\config.demo.example.json and set demo appId/depotId + steamworksSdk.
  echo.
  pause
  exit /b 1
)

if not exist "steam\config.playtest.local.json" (
  echo.
  echo  Missing steam\config.playtest.local.json
  echo  Copy steam\config.playtest.example.json and set playtest appId/depotId + steamworksSdk.
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

if not exist "steam_appid_playtest.txt" (
  echo.
  echo  Missing steam_appid_playtest.txt ^(playtest App ID^).
  echo.
  pause
  exit /b 1
)

echo.
echo  Building full + demo + playtest, then uploading all three to Steam.
echo  One Steam login / Steam Guard prompt for all editions.
echo  This takes a while ^(three Electron packages^).
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\steam-upload-all.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Upload-all failed ^(exit %ERR%^).
) else (
  echo  Done. Set each build live in Steamworks - SteamPipe - Builds ^(full / demo / playtest^).
)
echo.
pause
exit /b %ERR%
