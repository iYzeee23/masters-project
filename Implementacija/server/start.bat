@echo off
REM ============================================================
REM Start Backend Server (Express + MongoDB)
REM ============================================================
echo.
echo [SERVER] Starting Express backend on port 3000...
echo [SERVER] Press Ctrl+C to stop
echo.
cd /d "%~dp0"
npx ts-node src/index.ts
