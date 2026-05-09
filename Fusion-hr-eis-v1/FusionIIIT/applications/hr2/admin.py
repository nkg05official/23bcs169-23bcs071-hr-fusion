from django.contrib import admin

from .models import (
    ApprovalHierarchy,
    Appraisalform,
    CPDAAdvanceform,
    CPDAReimbursementform,
    EmpAppraisalForm,
    EmpConfidentialDetails,
    EmpDependents,
    Employee,
    ErrorLog,
    ForeignService,
    LTCform,
    LeaveClaim,
    LeaveBalance,
    LeaveForm,
    LeaveFormApprovalStep,
    LeaveFormAuditLog,
    LeavePerYear,
    SubstituteRequest,
    WorkAssignemnt,
)


# ── Core HR entities ─────────────────────────────────────────────────────────
admin.site.register(Employee)
admin.site.register(EmpConfidentialDetails)
admin.site.register(EmpDependents)
admin.site.register(ForeignService)
admin.site.register(EmpAppraisalForm)
admin.site.register(WorkAssignemnt)

# ── Leave management ─────────────────────────────────────────────────────────
admin.site.register(LeaveBalance)
admin.site.register(LeavePerYear)
admin.site.register(LeaveForm)
admin.site.register(LeaveClaim)
admin.site.register(LeaveFormApprovalStep)
admin.site.register(LeaveFormAuditLog)
admin.site.register(SubstituteRequest)
admin.site.register(ApprovalHierarchy)

# ── Financial forms ──────────────────────────────────────────────────────────
admin.site.register(LTCform)
admin.site.register(Appraisalform)
admin.site.register(CPDAAdvanceform)
admin.site.register(CPDAReimbursementform)

# ── System ───────────────────────────────────────────────────────────────────
admin.site.register(ErrorLog)