@echo off
setlocal
title Upload All A Dark Cave Steam Editions

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

if not exist "steam_appid_demo.txt" (
  echo.
  echo  Missing steam_appid_demo.txt ^(demo App ID 4971800^).
  echo.
  pause
  exit /b 1
)

echo.
echo  Building full + demo, then uploading both to Steam.
echo  Each packaged game is opened to confirm it starts, then closed.
echo  One Steam login / Steam Guard prompt for both editions.
echo  This takes a while ^(two Electron packages^).
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\steam-upload-all.ps1"
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Upload-all failed ^(exit %ERR%^).
) else (
  echo  Done. Set each build live in Steamworks - SteamPipe - Builds ^(full / demo^).
)
echo.
pause
exit /b %ERR%
