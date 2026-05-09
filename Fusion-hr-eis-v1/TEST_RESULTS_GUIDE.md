# How to Capture & Share Terminal Test Results for Domain Lead

## Prerequisites
- Virtual environment must be activated with Django/Python dependencies installed
- Tests must be written and available in the codebase

---

## Method 1: Quick Screenshot (Easiest)

### Step 1: Activate Virtual Environment
```powershell
cd c:\Users\nagen\OneDrive\Desktop
.\.venv\Scripts\Activate.ps1
```

### Step 2: Navigate to Project & Run Tests
```powershell
cd FusionIIIT
python manage.py test applications.hr2.tests -v 2
```

### Step 3: Take Screenshot
- **On Windows**: Press `Windows Key + Shift + S`
- Select the terminal window with test results
- Save as PNG file
- Share with domain lead

**File naming convention:**
```
test_results_hr2_[date].png
Example: test_results_hr2_2026-04-20.png
```

---

## Method 2: Save to Text File (More Professional)

### Step 1: Run Test & Capture Output
```powershell
cd c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT
python manage.py test applications.hr2.tests -v 2 | Tee-Object -FilePath test_results.txt
```

### Step 2: View Results
```powershell
notepad test_results.txt
```

### Step 3: Screenshot or Export
- Screenshot the Notepad window
- Or select all (Ctrl+A) → Copy → Paste into Word/PDF
- Save as `test_results.txt` or `test_results.docx`

---

## Method 3: Generate HTML Coverage Report (Professional)

### Step 1: Install Coverage Tool (if needed)
```powershell
pip install coverage
```

### Step 2: Run Tests with Coverage
```powershell
cd c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT
coverage run --source='applications.hr2' manage.py test applications.hr2.tests -v 2
coverage html
```

### Step 3: Open & Screenshot Report
```powershell
# Opens in default browser
start htmlcov/index.html
```

- Navigate through the coverage report
- Take screenshots of:
  - Coverage summary page
  - Module coverage breakdown
  - Specific test files
- Save as PNG or PDF

---

## Method 4: Export as Detailed Test Report

### Step 1: Run with XML Output
```powershell
python manage.py test applications.hr2.tests --keepdb --verbosity=2 > test_report.log 2>&1
```

### Step 2: View Full Report
```powershell
Get-Content test_report.log | Out-GridView
# Or use notepad
notepad test_report.log
```

---

## What to Show in Screenshots

### Include These Elements:
1. ✅ **Test Command** - Show what command was run
2. ✅ **Test Results Summary** - Pass/Fail/Error counts
3. ✅ **Individual Test Status** - Which tests passed/failed
4. ✅ **Execution Time** - How long tests took
5. ✅ **Coverage Percentage** - Code coverage metrics
6. ✅ **Error Messages** (if any) - For failed tests

### Example Output Structure:
```
============================== test session starts ==============================
platform win32 -- Python X.X.X, pytest-X.X.X, ...
collected N items

applications/hr2/tests/test_module.py::TestHRModule::test_cpda_form_submission PASSED
applications/hr2/tests/test_module.py::TestHRModule::test_leave_request_visibility PASSED
applications/hr2/tests/test_workflows_api.py::TestWorkflows::test_cpda_workflow PASSED

============================== X passed in X.XXs ==============================
```

---

## Quick Reference Commands

### Run All HR Tests
```powershell
python manage.py test applications.hr2 -v 2
```

### Run Specific Test Class
```powershell
python manage.py test applications.hr2.tests.test_workflows_api.TestWorkflows -v 2
```

### Run Specific Test Method
```powershell
python manage.py test applications.hr2.tests.test_workflows_api.TestWorkflows.test_cpda_advance -v 2
```

### Show Only Failures
```powershell
python manage.py test applications.hr2.tests --failfast
```

### Generate with Verbosity Options
```powershell
# -v 0 = Silent
# -v 1 = Normal (default)
# -v 2 = Verbose (shows all test methods)
# -v 3 = Very Verbose
python manage.py test applications.hr2 -v 2
```

---

## Recommended Workflow for Domain Lead Report

1. **Week 1**: Run baseline tests → Screenshot results
2. **After each feature**: Run tests → Screenshot
3. **Before release**: Run full suite with coverage → Generate HTML report
4. **Monthly summary**: Compile all screenshots into PDF or document

---

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'django'"
**Solution**: Activate virtual environment first
```powershell
.\.venv\Scripts\Activate.ps1
```

### Error: "No database available"
**Solution**: Run migrations first
```powershell
python manage.py migrate
```

### Error: "No tests found in 'applications.hr2.tests'"
**Solution**: Check test files exist
```powershell
ls applications/hr2/tests/
```

---

## File Organization for Domain Lead

```
Test_Reports/
├── 2026-04-20/
│   ├── test_results_hr2_2026-04-20.png
│   ├── coverage_report_2026-04-20.html
│   └── test_summary.txt
├── 2026-04-21/
│   ├── test_results_hr2_2026-04-21.png
│   ├── coverage_report_2026-04-21.html
│   └── test_summary.txt
```

---

## Example Domain Lead Email

Subject: HR Module Test Results - April 20, 2026

Hi [Domain Lead],

Attached are the test results for the HR module covering:
- CPDA form submission fixes
- Leave request visibility enhancements
- Faculty role access improvements

**Summary:**
- Total Tests: X
- Passed: X
- Failed: X
- Code Coverage: XX%
- Execution Time: X seconds

**Screenshots included:**
1. Full test output
2. Coverage report
3. Module breakdown

Best regards,
[Your Name]

---
