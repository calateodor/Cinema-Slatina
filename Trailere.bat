@echo off
title Trailere - Cinema Slatina
cd /d "%~dp0cinema-slatina"
echo Pornesc panoul de trailere...
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://127.0.0.1:4310"
call npm run trailere
echo.
echo Panoul s-a oprit.
pause
