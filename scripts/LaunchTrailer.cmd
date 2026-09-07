@echo off
setlocal
title A Dark Cave Trailer

set "ROOT=%~dp0.."
cd /d "%ROOT%"
set "PATH=C:\Program Files\nodejs;%PATH%"
set "URL=http://localhost:5000/"

echo.
echo  Opening 1920x1080 trailer window...
echo.

curl.exe -s -o nul -m 2 "%URL%"
if not errorlevel 1 goto launch

echo  Dev server is not running. Starting it in a minimized window...
start "A Dark Cave Dev" /min cmd /k cd /d "%ROOT%" ^&^& npx --yes cross-env NODE_ENV=development NODE_OPTIONS=--max-old-space-size=4096 npx tsx server/index.ts

set /a TRIES=0
:waitloop
curl.exe -s -o nul -m 1 "%URL%"
if not errorlevel 1 goto launch
set /a TRIES+=1
if %TRIES% GEQ 40 goto serverfail
timeout /t 1 /nobreak >nul
goto waitloop

:launch
node "%ROOT%\scripts\launch-trailer-window.mjs"
set "ERR=%ERRORLEVEL%"
if %ERR% neq 0 (
  echo.
  echo  Trailer window failed ^(exit %ERR%^).
  echo.
  pause
)
exit /b %ERR%

:serverfail
echo.
echo  Server did not come up on %URL%
echo  Start it yourself with npm run dev, then run this again.
echo.
pause
exit /b 1
