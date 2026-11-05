@echo off
title Customer Intelligence AI - Frontend Dev Server
echo Starting Vite Frontend Dev Server with Hot Reload...
echo Frontend Dev URL: http://localhost:3000 (Proxying /api to http://127.0.0.1:8000)
cd frontend
npm.cmd run dev
pause

