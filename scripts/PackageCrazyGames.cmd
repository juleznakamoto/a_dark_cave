@echo off
setlocal
title Package A Dark Cave CrazyGames Zip

set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo.
echo  Building CrazyGames demo zip...
echo.

call npm run package:crazygames
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Package failed ^(exit %ERR%^).
) else (
  echo  Done. Zip: %ROOT%\release\a-dark-cave-crazygames.zip
  echo  Upload it at https://developer.crazygames.com
  explorer /select,"%ROOT%\release\a-dark-cave-crazygames.zip"
)
echo.
pause
exit /b %ERR%
