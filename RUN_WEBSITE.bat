@echo off
title Customer Intelligence AI - Web Dashboard
echo =====================================================================
echo   CUSTOMER INTELLIGENCE AI: ENTERPRISE ANALYTICS & DASHBOARD
echo =====================================================================
echo.
echo   [1/2] Starting Dashboard Server on Ports 8000 & 8080...
echo   [2/2] Launching Web Browser...
echo.
echo   Primary URL:   http://localhost:8000
echo   Alternate URL: http://localhost:8080
echo   Fallback URL:  http://127.0.0.1:8000
echo.
echo =====================================================================
echo   Press Ctrl+C in this window to stop the server at any time.
echo =====================================================================

REM Open browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"

REM Run FastAPI server with project virtual environment
"%~dp0.venv\Scripts\python.exe" "%~dp0dashboard_api.py"
pause

