# Leave Approval Workflow - Implementation Guide

## Overview
Implements hierarchical leave approval workflow per BRS-UC-WF specifications:
- Faculty/Staff submit leave → Routed to HoD → Auto-escalates through hierarchy → Final approval by Director
- Automatic escalation: When an approver approves, it automatically goes to the next level
- BR-HR-010: CL/RH only → HoD is final; Other types → Multi-level routing

## Approval Hierarchy

### Configuration
```
Department → Leave Type → Approval Levels
            ├── CL/RH Only
            │   └─ Level 1: HoD (Final) [3 days SLA]
            │
            └── SCL/HR/COL/VL (Multi-level)
                ├─ Level 1: HoD [3 days SLA]
                ├─ Level 2: Dean [3 days SLA]
                ├─ Level 3: Registrar [3 days SLA]
                └─ Level 4: Director [5 days SLA - Final]
```

### User Roles & Designations

**Faculty Users** (Faculty Member role):
- `faculty_user1` (Computer Science) - For testing leave submissions
- `faculty_user2` (Physics) - For testing leave submissions

**Non-Teaching Staff** (Staff role):
- `staff_user1` (Computer Science) - For testing leave submissions
- `staff_user2` (Physics) - For testing leave submissions

**Authority Users** (One per role, specific department):
- `hod_cse` - Head of Department (Computer Science)
- `hod_physics` - Head of Department (Physics)
- `dean_user` - Dean (Computer Science)
- `registrar_user` - Registrar (Computer Science)
- `director_user` - Director (Computer Science)

**Admin Users**:
- `hr_admin` - HR Administrator
- `finance_user` - Finance Officer

## Key Processes

### 1. Leave Submission & Auto-Routing

**When Faculty/Staff submits leave:**
```
Employee → Validation → Route to HoD
                       ├─ Determine leave type category
                       ├─ Get employee's department
                       ├─ Find HoD for that department
                       └─ Create LeaveFormApprovalStep(Level=1, Status=Pending)
```

**State Machine:**
- `draft` → `submitted` (HoD assigned)

### 2. Automatic Escalation

**When approver approves:**
```
HoD Approves → Check if final (CL/RH only?)
              ├─ YES → Mark as final_approved
              └─ NO → Create next approval step (Level 2)
                     ├─ Find Dean
                     ├─ Create LeaveFormApprovalStep
                     └─ Continue...
```

**State Transitions:**
- `submitted` → `hod_approved` (if CL/RH: `final_approved`)
- `hod_approved` → `admin_approved` (escalate to Dean)
- `admin_approved` → escalated to Registrar
- Registrar → escalated to Director
- Director → `final_approved`

### 3. SLA Monitoring

- Each approval step has `sla_days` and `due_date`
- Automatic escalation flag when SLA breached
- Monitors via `check_sla_breaches()` function (should run periodically)

## Database Models

### LeaveFormApprovalStep
Tracks each step in the approval hierarchy:
```python
LeaveFormApprovalStep {
    leave_form: FK → LeaveForm
    approval_hierarchy: FK → ApprovalHierarchy
    step_number: 1, 2, 3, 4...
    assigned_to: FK → Employee (the approver)
    status: 'pending' | 'accepted' | 'rejected' | 'escalated'
    due_date: calculated based on SLA
    response_date: when approver responds
    remarks: notes from approver
}
```

### ApprovalHierarchy
Defines approval rules:
```python
ApprovalHierarchy {
    form_type: 'leave'
    leave_type: 'CL_RH_Only' | 'SCL_HR_COL_VL'
    approval_level: 1, 2, 3, 4
    required_designation: FK → Designation
    sla_days: 3 or 5
    can_reject: True
    can_forward: True (False for final step)
}
```

## Integration Points

### 1. Leave Submission Endpoint
**File:** applications/hr2/api/views.py
**Function:** GenericFormAPIView.post() for Leave type

**Change:** After LeaveForm is created, call:
```python
from leave_approval_services import route_leave_for_approval

leave_form = LeaveForm.objects.create(...)
route_leave_for_approval(leave_form)  # Auto-route to HoD
```

### 2. Approval Decision Endpoints
**File:** applications/hr2/api/views.py
**New endpoints needed:**
- `POST /hr2/api/leave-approval/{step_id}/approve`
- `POST /hr2/api/leave-approval/{step_id}/reject`

**Logic:**
```python
def approve_leave_approval_step(request, step_id):
    approval_step = LeaveFormApprovalStep.objects.get(id=step_id)
    
    if approval_step.assigned_to.id != request.user:
        raise PermissionDenied()
    
    from leave_approval_services import approve_leave_step
    next_step = approve_leave_step(approval_step, request.data.get('remarks', ''))
    
    # Notify next approver if exists
    if next_step:
        send_notification(next_step.assigned_to, f"Leave {next_step.leave_form.id} pending your approval")
    
    return Response({"status": "approved", "next_step": next_step.id if next_step else None})
```

### 3. Inbox Endpoints
**Update:** applications/hr2/api/views.py - get_leave_inbox()

**Change:** Include pending LeaveFormApprovalStep items:
```python
def get_leave_inbox(request):
    user = request.user
    employee = Employee.objects.filter(id=user).first()
    
    # Get pending approvals
    pending_approvals = LeaveFormApprovalStep.objects.filter(
        assigned_to=employee,
        status='pending'
    ).select_related('leave_form')
    
    # Format and return
    approval_items = [...]  # Convert to DTO
    return Response({
        'leave_inbox': ...,
        'pending_approvals': approval_items,  # NEW
        ...
    })
```

## Frontend Integration

### Approver Dashboard
**Components needed:**
- `PendingApprovalsTable.jsx` - Shows pending leaves for approver
- `LeaveApprovalDetail.jsx` - Shows leave details
- `ApprovalActionButtons.jsx` - Approve/Reject buttons
- `ApprovalStepTracker.jsx` - Shows which step leave is at

### Employee Dashboard
**Update existing:**
- `LeaveInbox.jsx` - Show approval progress
- `LeaveRequestStatus.jsx` - Show current approver, due date, SLA status

## Setup Steps

### 1. Run Setup Script
```bash
cd c:\Users\nagen\OneDrive\Desktop\Fusion\FusionIIIT
python setup_leave_hierarchy.py
```

**Creates:**
- 10 test users with specific roles
- Leave balances for each user
- Approval hierarchy configurations
- Department mappings

### 2. Database Migrations
```bash
python manage.py migrate
```

### 3. Test the Flow
```bash
python manage.py shell < leave_approval_services.py
```

**OR run:**
```bash
python leave_approval_services.py
```

This will:
- Create a test leave request
- Route to HoD
- Simulate HoD approval
- Show escalation to next level

## API Examples

### Submit Leave (Auto-routes)
```bash
POST /hr2/api/leave/ 
{
    "name": "John Doe",
    "designation": "Faculty",
    "leaveStartDate": "2026-04-25",
    "leaveEndDate": "2026-04-27",
    "Noof_CasualLeave": 3,
    "purpose": "Personal leave"
}

Response:
{
    "id": 123,
    "state": "submitted",
    "next_approval_assigned_to": {
        "username": "hod_cse",
        "designation": "Head of Department"
    }
}
```

### Get Pending Approvals
```bash
GET /hr2/api/leave-approvals/pending

Response:
{
    "pending_approvals": [
        {
            "approval_step_id": 1,
            "leave_form_id": 123,
            "employee": "John Doe",
            "leave_dates": "2026-04-25 to 2026-04-27",
            "status": "pending",
            "step_number": 1,
            "due_date": "2026-04-22"
        }
    ]
}
```

### Approve Leave
```bash
POST /hr2/api/leave-approval/{step_id}/approve
{
    "remarks": "Approved by HoD"
}

Response:
{
    "status": "approved",
    "next_step": {
        "step_number": 2,
        "assigned_to": "dean_user",
        "due_date": "2026-04-23"
    }
}
```

## Testing Scenarios

### Scenario 1: CL/RH Only Leave
```
Faculty submits 3 days CL
→ Routed to HoD (Level 1)
→ HoD approves
→ Leave FINAL APPROVED (HoD is final authority)
```

### Scenario 2: SCL Leave (Multi-level)
```
Faculty submits 2 days SCL
→ Routed to HoD (Level 1)
→ HoD approves → escalates to Dean (Level 2)
→ Dean approves → escalates to Registrar (Level 3)
→ Registrar approves → escalates to Director (Level 4)
→ Director approves → Leave FINAL APPROVED
```

### Scenario 3: SLA Breach
```
Leave pending at HoD for > 3 days
→ System marks as 'escalated'
→ Flagged in admin dashboard
→ Notification sent to manager
```

## Monitoring & Maintenance

### Check SLA Status
```bash
python manage.py shell
from leave_approval_services import check_sla_breaches
check_sla_breaches()
```

### View All Pending Leaves
```bash
python manage.py shell
from applications.hr2.models import LeaveFormApprovalStep
pending = LeaveFormApprovalStep.objects.filter(status='pending')
for p in pending:
    print(f"Leave {p.leave_form.id}, Step {p.step_number}, Days remaining: {(p.due_date - datetime.now()).days}")
```

### Manual Route Fix (if needed)
```bash
python manage.py shell
from leave_approval_services import route_leave_for_approval
from applications.hr2.models import LeaveForm

leave = LeaveForm.objects.get(id=123)
route_leave_for_approval(leave)  # Re-route to correct HoD
```

## Migration Path from Old System

If there are existing leave forms in old format:

```python
from applications.hr2.models import LeaveForm, LeaveFormApprovalStep
from leave_approval_services import route_leave_for_approval

# Find all submitted leaves without approval steps
orphaned_leaves = LeaveForm.objects.filter(
    state='submitted',
    approval_steps__isnull=True  # No approval steps yet
)

for leave in orphaned_leaves:
    try:
        route_leave_for_approval(leave)
        print(f"✓ Routed leave {leave.id}")
    except Exception as e:
        print(f"✗ Error routing leave {leave.id}: {e}")
```

## Key BRs Implemented

- **BR-HR-010**: HoD Final Scope (CL/RH only)
- **BR-HR-018**: Resolve Hierarchy & Next Approver
- **BR-HR-019**: SLA Monitoring & Escalations
- **BR-HR-003**: Non-Overlap validation
- **BR-HR-001/002**: Leave eligibility & entitlements

## Next Steps

1. ✅ Create test users & hierarchy (done)
2. ✅ Create approval services (done)
3. ⏳ Update leave submission endpoint to auto-route
4. ⏳ Create approval decision endpoints
5. ⏳ Update inbox to show pending approvals
6. ⏳ Build approver dashboard UI
7. ⏳ Add notifications/emails
8. ⏳ Add SLA monitoring job
9. ⏳ Performance optimize queries
10. ⏳ Add audit logging for approvals
