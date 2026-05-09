# Automated Test Results Capture Script for HR Module
# Usage: .\capture_test_results.ps1
# This script runs tests, captures coverage, and organizes results for domain lead

param(
    [switch]$OpenBrowser = $false,
    [switch]$SkipCoverage = $false
)

# Get current date
$dateStr = Get-Date -Format "yyyy-MM-dd"
$timeStr = Get-Date -Format "HH-mm-ss"

# Create output directory
$outputDir = "c:\Users\nagen\OneDrive\Desktop\Test_Results\$dateStr\$timeStr"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HR Module Test Results Capture Script" -ForegroundColor Cyan
Write-Host "Date: $dateStr" -ForegroundColor Cyan
Write-Host "Time: $timeStr" -ForegroundColor Cyan
Write-Host "Output Directory: $outputDir" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project
Set-Location "c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT"

# Check if virtual environment is activated by checking for django
$envOk = $false
try {
    # Try running python with django import
    $test = & "..\venv\Scripts\python.exe" -c "import django; print('OK')" 2>$null
    if ($test -eq "OK") {
        $envOk = $true
        Write-Host "✓ Virtual environment: OK" -ForegroundColor Green
    }
} catch {
    $envOk = $false
}

if (-not $envOk) {
    Write-Host "✗ ERROR: Virtual environment not found or not working!" -ForegroundColor Red
    Write-Host "Expected at: c:\Users\nagen\OneDrive\Desktop\Fusion\venv" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Running HR Module Tests..." -ForegroundColor Yellow
Write-Host ""

# Run tests and capture output
# We use the full path to python in the venv to be safe
$pythonExe = "..\venv\Scripts\python.exe"
$testOutput = & $pythonExe manage.py test applications.hr2.tests -v 2 2>&1
$testOutput | Tee-Object -FilePath "$outputDir\test_results.txt" | Select-Object -Last 20

Write-Host ""
Write-Host "Running Coverage Analysis..." -ForegroundColor Yellow

if (-not $SkipCoverage) {
    # Run coverage
    & $pythonExe -m coverage run --source='applications.hr2' manage.py test applications.hr2.tests 2>&1 | Out-Null
    & $pythonExe -m coverage report | Tee-Object -FilePath "$outputDir\coverage_report.txt"
    & $pythonExe -m coverage html --directory="$outputDir\coverage_html" 2>&1 | Out-Null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Results Saved Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Output files created:" -ForegroundColor Yellow
Write-Host "  ✓ $outputDir\test_results.txt" -ForegroundColor Green
if (-not $SkipCoverage) {
    Write-Host "  ✓ $outputDir\coverage_report.txt" -ForegroundColor Green
    Write-Host "  ✓ $outputDir\coverage_html\index.html" -ForegroundColor Green
}

# Parse test results to extract summary
Write-Host ""
Write-Host "Test Summary:" -ForegroundColor Cyan
$testOutput | Select-String -Pattern "(Ran|OK|FAILED|ERROR)" | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }

if ($OpenBrowser -and (Test-Path "$outputDir\coverage_html\index.html")) {
    Write-Host ""
    Write-Host "Opening coverage report in browser..." -ForegroundColor Yellow
    Start-Process "$outputDir\coverage_html\index.html"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done! Results folder opened." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Open explorer to show results
Invoke-Item $outputDir
