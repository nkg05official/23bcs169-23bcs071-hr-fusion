@echo off
REM Automated Test Results Capture Script for HR Module
REM Run this from Desktop to capture and organize test results

setlocal enabledelayedexpansion

REM Get current date in YYYY-MM-DD format
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)

REM Create output directory
set OUTPUT_DIR=c:\Users\nagen\OneDrive\Desktop\Test_Results\%mydate%
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo ========================================
echo HR Module Test Results Capture Script
echo Date: %mydate%
echo Output Directory: %OUTPUT_DIR%
echo ========================================

REM Change to Fusion directory
cd /d c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT

REM Check if virtual environment is activated
python -c "import django" 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Virtual environment not activated!
    echo Please run: .\.venv\Scripts\Activate.ps1
    echo.
    pause
    exit /b 1
)

echo Virtual environment: OK
echo.

REM Run tests and capture output
echo Running HR Module Tests...
echo.

python manage.py test applications.hr2.tests -v 2 > "%OUTPUT_DIR%\test_results.txt" 2>&1

echo.
echo Running Coverage Analysis...
coverage run --source='applications.hr2' manage.py test applications.hr2.tests > "%OUTPUT_DIR%\coverage_run.txt" 2>&1
coverage report > "%OUTPUT_DIR%\coverage_report.txt" 2>&1
coverage html --directory="%OUTPUT_DIR%\coverage_html" > nul 2>&1

echo.
echo ========================================
echo Test Results Saved!
echo ========================================
echo.
echo Output files created:
echo   - %OUTPUT_DIR%\test_results.txt
echo   - %OUTPUT_DIR%\coverage_report.txt
echo   - %OUTPUT_DIR%\coverage_html\index.html
echo.

REM Display results
echo Test Results Summary:
echo =====================
type "%OUTPUT_DIR%\test_results.txt" | find /v "^$"

echo.
echo Coverage Report:
echo ================
type "%OUTPUT_DIR%\coverage_report.txt"

echo.
echo ========================================
echo Next Steps for Domain Lead:
echo 1. Take screenshot of test results above
echo 2. Open in browser: %OUTPUT_DIR%\coverage_html\index.html
echo 3. Screenshot the coverage report
echo 4. Share both images with domain lead
echo ========================================
echo.

pause
