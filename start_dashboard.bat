@echo off
title Customer Intelligence AI Dashboard
echo =====================================================================
echo  CUSTOMER INTELLIGENCE AI: ENTERPRISE ANALYTICS & ML PREDICTIONS
echo =====================================================================
echo  Primary URL:   http://localhost:8000
echo  Alternate URL: http://localhost:8080
echo  Fallback URL:  http://127.0.0.1:8000
echo  Press Ctrl+C to stop the server.
echo =====================================================================
.venv\Scripts\python.exe dashboard_api.py
pause

