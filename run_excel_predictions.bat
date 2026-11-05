@echo off
title Customer Intelligence AI - Predict from Excel Worksheet
echo =====================================================================
echo  CUSTOMER INTELLIGENCE AI: EXCEL WORKSHEET PREDICTION RUNNER
echo =====================================================================
echo  Input Worksheet:  transactions_template.xlsx (or specify below)
echo  Output Report:    predictions_output.xlsx
echo =====================================================================

set /p INPUT_FILE="Enter Excel filename (press Enter to use transactions_template.xlsx): "
if "%INPUT_FILE%"=="" set INPUT_FILE=transactions_template.xlsx

echo.
echo Processing %INPUT_FILE% ...
.venv\Scripts\python.exe predict_from_excel.py --input "%INPUT_FILE%" --output predictions_output.xlsx

echo.
echo =====================================================================
echo  Predictions complete! Open predictions_output.xlsx to see results.
echo =====================================================================
pause

