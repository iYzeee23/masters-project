@echo off
REM ============================================================
REM Build Everything (Tailwind + Angular + Server TS check)
REM Run from: c:\Fakultet\Zavrsni\Implementacija
REM ============================================================
echo.
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
pause
