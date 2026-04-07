@echo off
REM ============================================================
REM Start Frontend (Tailwind + Angular)
REM ============================================================
echo.
echo [CLIENT] Building Tailwind CSS...
cd /d "%~dp0"
call npx @tailwindcss/cli -i src/styles.css -o src/tailwind-output.css 2>nul
echo [CLIENT] Tailwind done!
echo.
echo [CLIENT] Starting Angular on http://localhost:4200
echo [CLIENT] Press Ctrl+C to stop
echo.
npx ng serve --port 4200
