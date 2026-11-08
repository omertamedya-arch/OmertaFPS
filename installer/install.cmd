@echo off
chcp 65001 >nul
title Omerta FPS Pro Kurulum
setlocal

fltmc >nul 2>&1
if not errorlevel 1 goto elevated

echo.
echo   Omerta FPS Pro kurulumu icin yonetici izni isteniyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs -Wait"
exit /b

:elevated
echo.
echo   OMERTA FPS PRO
echo   E-spor ve oyun optimizasyonu kurulumu
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
set "RESULT=%ERRORLEVEL%"

if "%RESULT%"=="0" goto done
echo.
echo   Kurulum tamamlanamadi. Hata kodu: %RESULT%
pause
exit /b %RESULT%

:done
exit /b 0
