@echo off
REM ============================================================
REM Stop all Node.js processes
REM Run from: c:\Fakultet\Zavrsni\Implementacija
REM ============================================================
echo.
echo [STOP] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo [STOP] Done!
echo.
pause
