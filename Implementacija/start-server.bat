@echo off
REM ============================================================
REM Start Backend Server (Express + MongoDB)
REM Run from: c:\Fakultet\Zavrsni\Implementacija
REM ============================================================
echo.
echo [SERVER] Starting Express backend on port 3000...
echo [SERVER] Press Ctrl+C to stop
echo.
cd /d "%~dp0server"
npx ts-node src/index.ts
