@echo off
REM ============================================================
REM Clean build artifacts
REM Run from: c:\Fakultet\Zavrsni\Implementacija
REM ============================================================
echo.
echo [CLEAN] Removing build artifacts...

if exist "%~dp0client\dist" rmdir /s /q "%~dp0client\dist"
if exist "%~dp0client\.angular" rmdir /s /q "%~dp0client\.angular"
if exist "%~dp0server\dist" rmdir /s /q "%~dp0server\dist"
if exist "%~dp0client\src\tailwind-output.css" del /q "%~dp0client\src\tailwind-output.css"

echo [CLEAN] Done!
echo.
pause
