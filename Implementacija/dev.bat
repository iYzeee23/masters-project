@echo off
REM ============================================================
REM dev.bat — Pathfinder Development Script
REM Run from: c:\Fakultet\Zavrsni\Implementacija
REM ============================================================

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="build" goto :build
if "%1"=="stop" goto :stop
if "%1"=="clean" goto :clean
if "%1"=="all" goto :all
echo Unknown option: %1
goto :help

:help
echo.
echo   Pathfinder Dev Script
echo   =====================
echo.
echo   dev.bat build    Build everything (Tailwind + Angular + TS check)
echo   dev.bat stop     Stop all Node.js processes
echo   dev.bat clean    Remove build artifacts
echo   dev.bat all      Stop + Clean + Build
echo   dev.bat help     Show this help
echo.
goto :end

:stop
echo.
echo [STOP] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo [STOP] Done!
echo.
goto :end

:clean
echo.
echo [CLEAN] Removing build artifacts...
if exist "%~dp0client\dist" rmdir /s /q "%~dp0client\dist"
if exist "%~dp0client\.angular" rmdir /s /q "%~dp0client\.angular"
if exist "%~dp0server\dist" rmdir /s /q "%~dp0server\dist"
if exist "%~dp0client\src\tailwind-output.css" del /q "%~dp0client\src\tailwind-output.css"
echo [CLEAN] Done!
echo.
goto :end

:all
echo.
echo ========================================
echo   STOP + CLEAN + BUILD
echo ========================================
echo.
echo [STOP] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo [STOP] Done!
echo.
echo [CLEAN] Removing build artifacts...
if exist "%~dp0client\dist" rmdir /s /q "%~dp0client\dist"
if exist "%~dp0client\.angular" rmdir /s /q "%~dp0client\.angular"
if exist "%~dp0server\dist" rmdir /s /q "%~dp0server\dist"
if exist "%~dp0client\src\tailwind-output.css" del /q "%~dp0client\src\tailwind-output.css"
echo [CLEAN] Done!
echo.

:build
echo [BUILD] Tailwind CSS...
cd /d "%~dp0client"
call npx @tailwindcss/cli -i src/styles.css -o src/tailwind-output.css 2>nul
echo [BUILD] Tailwind done!

echo.
echo [BUILD] Angular client...
call npx ng build
if errorlevel 1 (
    echo [BUILD] CLIENT FAILED!
    pause
    exit /b 1
)
echo [BUILD] Client done!

echo.
echo [BUILD] Server TypeScript check...
cd /d "%~dp0server"
call npx tsc --noEmit
if errorlevel 1 (
    echo [BUILD] SERVER FAILED!
    pause
    exit /b 1
)
echo [BUILD] Server done!

echo.
echo ========================================
echo   BUILD COMPLETE - no errors!
echo ========================================
echo.

:end
cd /d "%~dp0"
