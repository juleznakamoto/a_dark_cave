@echo off
setlocal
title Package A Dark Cave CrazyGames Folder

set "ROOT=%~dp0.."
cd /d "%ROOT%"

echo.
echo  Building CrazyGames demo folder and zip...
echo.

call npm run package:crazygames
set "ERR=%ERRORLEVEL%"

echo.
if %ERR% neq 0 (
  echo  Package failed ^(exit %ERR%^).
) else (
  echo  Done.
  echo  Folder: %ROOT%\release\a-dark-cave-crazygames
  echo  Zip:    %ROOT%\release\a-dark-cave-crazygames.zip
  echo  Upload the zip at https://developer.crazygames.com
  explorer /select,"%ROOT%\release\a-dark-cave-crazygames.zip"
)
echo.
pause
exit /b %ERR%
