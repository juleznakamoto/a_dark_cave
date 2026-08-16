@echo off
setlocal
title Package A Dark Cave CrazyGames Folder

set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo.
echo  Building CrazyGames demo folder...
echo.

call npm run package:crazygames
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Package failed ^(exit %ERR%^).
) else (
  echo  Done. Folder: %ROOT%\release\a-dark-cave-crazygames
  echo  Upload that folder at https://developer.crazygames.com
  explorer "%ROOT%\release\a-dark-cave-crazygames"
)
echo.
pause
exit /b %ERR%
