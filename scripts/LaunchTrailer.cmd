@echo off
setlocal
title A Dark Cave Trailer

set "ROOT=%~dp0.."
cd /d "%ROOT%"
set "PATH=%ProgramFiles%\nodejs;%PATH%"
set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
set "TSX=%ROOT%\node_modules\tsx\dist\cli.mjs"

echo.
echo  Opening 1920x1080 trailer window...
echo.

set "URL="
for %%P in (5000 5173 5174) do (
  if not defined URL (
    curl.exe -s -o nul -m 1 -f http://127.0.0.1:%%P/ >nul 2>&1
    if not errorlevel 1 set "URL=http://127.0.0.1:%%P/"
  )
)

if defined URL goto launch

if not exist "%NODE_EXE%" (
  echo  Node not found at "%NODE_EXE%"
  pause
  exit /b 1
)
if not exist "%TSX%" (
  echo  tsx not found. Run npm install in the repo first.
  pause
  exit /b 1
)

echo  No local game found. Starting the dev server...
start "A Dark Cave Dev" cmd /k set NODE_ENV=development^& set NODE_OPTIONS=--max-old-space-size=4096^& cd /d "%ROOT%"^& "%NODE_EXE%" "%TSX%" server/index.ts

set /a TRIES=0
:waitloop
curl.exe -s -o nul -m 1 -f http://127.0.0.1:5000/ >nul 2>&1
if not errorlevel 1 (
  set "URL=http://127.0.0.1:5000/"
  goto launch
)
set /a TRIES+=1
if %TRIES% GEQ 45 goto serverfail
timeout /t 1 /nobreak >nul
goto waitloop

:launch
echo  Using %URL%
"%NODE_EXE%" "%ROOT%\scripts\launch-trailer-window.mjs" "%URL%"
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
echo  Dev server did not come up on http://127.0.0.1:5000/
echo  Start the game locally, then run this again.
echo.
pause
exit /b 1
