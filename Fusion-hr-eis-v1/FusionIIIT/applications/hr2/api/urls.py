from django.urls import path

from . import views



app_name = 'hr2'

urlpatterns = [
    # LTC form
    path('ltc/', views.LTC.as_view(), name='LTC_form'),
    #  cpda advance form
    path('cpdaadv/', views.CPDAAdvance.as_view(), name='CPDAAdvance_form'),
    #  appraisal form
    path('appraisal/', views.Appraisal.as_view(), name='Appraisal_form'),
    # cpda reimbursement form
    path('cpdareim/', views.CPDAReimbursement.as_view(),
        name='CPDAReimbursement_form'),
    #  leave form
    path('leave/', views.Leave.as_view(), name='Leave_form'),
    path('formManagement/', views.FormManagement.as_view(), name='formManagement'),
    path('tracking/', views.TrackProgress.as_view(), name='tracking'),
    path('formFetch/', views.FormFetch.as_view(), name='fetch_form'),
    #  create for GetForms
    path('getForms/', views.GetFormHistory.as_view(), name='getForms'),
    path('leaveBalance/', views.CheckLeaveBalance.as_view(), name='leaveBalance'),
    path('getDesignations/', views.DropDown.as_view(), name="designations"),
    path('getOutbox/', views.GetOutbox.as_view(), name='outbox'),
    path('getArchive/', views.ViewArchived.as_view(), name='archive'),
    path('getuserbyid/', views.UserById.as_view(), name='userById'),
    path('get_my_details', views.get_my_details, name='get_my_details'), # Added
    path('search_employee', views.search_employees, name='search_employee'), # Added (alias)

    # Compatibility aliases for legacy HR API endpoints.
    path('v1/legacy/get_leave_balance', views.get_leave_balance, name='get_leave_balance'),
    path('v1/legacy/search_employees', views.search_employees, name='search_employees'),
    path('v1/legacy/get_form_initials', views.get_form_initials, name='get_form_initials'),
    path('v1/legacy/submit_leave_form', views.submit_leave_form, name='submit_leave_form'),
    path('v1/legacy/get_leave_requests', views.get_leave_requests, name='get_leave_requests'),
    path('v1/legacy/get_leave_form_by_id/<int:form_id>/', views.get_leave_form_by_id, name='get_leave_form_by_id'),
    path(
        'handle_leave_academic_responsibility/<int:form_id>/',
        views.handle_leave_academic_responsibility,
        name='handle_leave_academic_responsibility',
    ),
    path(
        'handle_leave_administrative_responsibility/<int:form_id>/',
        views.handle_leave_administrative_responsibility,
        name='handle_leave_administrative_responsibility',
    ),
    path('v1/legacy/get_leave_inbox', views.get_leave_inbox, name='get_leave_inbox'),
    path('v1/legacy/download_leave_form_pdf/<int:form_id>/', views.download_leave_form_pdf, name='download_leave_form_pdf'),
    path('v1/legacy/handle_leave_file/<int:form_id>/', views.handle_leave_file, name='handle_leave_file'),
    path('v1/legacy/admin_get_leave_balance/<str:empid>/', views.admin_get_leave_balance, name='admin_get_leave_balance'),
    path('v1/legacy/admin_get_all_leave_balances/', views.admin_get_all_leave_balances, name='admin_get_all_leave_balances'),
    path('v1/legacy/admin_update_leave_balance/<str:empid>/', views.admin_update_leave_balance, name='admin_update_leave_balance'),
    path('v1/legacy/admin_get_leave_requests/<str:empid>/', views.admin_get_leave_requests, name='admin_get_leave_requests'),
    path('v1/legacy/hr_employees', views.get_hr_employees, name='get_hr_employees'),
    path('v1/legacy/get_track_file/<int:id>/', views.track_file_react, name='track_file_react'),
    path('v1/legacy/offline_leave_form', views.offline_leave_form, name='offline_leave_form'),
    path('v1/legacy/get_employee_initials/<str:empid>/', views.get_employee_initials, name='get_employee_initials'),

    # UC-061 — Modify Pending Leave (BR-HR-020)
    path('v1/legacy/modify_leave_form/<int:form_id>/', views.modify_leave_form, name='modify_leave_form'),
    # UC-065 — Withdraw Leave (BR-HR-021)
    path('v1/legacy/withdraw_leave_form/<int:form_id>/', views.withdraw_leave_form, name='withdraw_leave_form'),
    # UC-091 — Notify Resumption (BR-HR-024)
    path('v1/legacy/notify_leave_resumption/<int:form_id>/', views.notify_leave_resumption, name='notify_leave_resumption'),
    # UC-092 — Verify Resumption (HR Admin, BR-HR-024)
    path('v1/legacy/verify_leave_resumption/<int:form_id>/', views.verify_leave_resumption, name='verify_leave_resumption'),
    # BR-HR-010/011/012 — Approval path query
    path('v1/legacy/get_leave_approval_path/<int:form_id>/', views.get_leave_approval_path, name='get_leave_approval_path'),

    # UC-021 — HoD Decision on Leave (BR-HR-010)
    path('v1/legacy/hod_decision_on_leave/<int:form_id>/', views.hod_decision_on_leave, name='hod_decision_on_leave'),
    # UC-031 — Sanctioning Authority Decision (BR-HR-012, BR-HR-028)
    path('v1/legacy/sanctioning_decision_on_leave/<int:form_id>/', views.sanctioning_decision_on_leave, name='sanctioning_decision_on_leave'),
    # UC-121 — Leave Policy Parameters Admin
    path('v1/legacy/manage_leave_policy/', views.manage_leave_policy, name='manage_leave_policy'),
    # UC-122 — Holiday Calendar Admin
    path('v1/legacy/manage_holiday_calendar/', views.manage_holiday_calendar, name='manage_holiday_calendar'),
    # UC-302 — HR Admin Verify LTC Claim
    path('v1/legacy/verify_ltc_claim/<int:form_id>/', views.verify_ltc_claim, name='verify_ltc_claim'),
    # UC-304 — Accountant LTC Disbursement (BR-HR-408)
    path('v1/legacy/disburse_ltc_payment/<int:form_id>/', views.disburse_ltc_payment, name='disburse_ltc_payment'),
    # UC-403 — CPDA Reconciliation
    path('v1/legacy/submit_cpda_reconciliation/<int:form_id>/', views.submit_cpda_reconciliation, name='submit_cpda_reconciliation'),
    # UC-201 — Assign Appraisal Reviewer
    path('v1/legacy/assign_appraisal_reviewer/<int:form_id>/', views.assign_appraisal_reviewer, name='assign_appraisal_reviewer'),

    # FRONTEND COMPATIBILITY ALIASES (FIXING 404s)
    path('get_ltc_requests', views.get_ltc_requests, name='get_ltc_requests'),
    path('get_ltc_inbox', views.get_leave_inbox, name='get_ltc_inbox'), # Reuse leave inbox logic
    path('get_ltc_archive', views.ViewArchived.as_view(), name='get_ltc_archive'), # Reuse generic archive

    path('get_cpda_adv_requests', views.get_cpda_adv_requests, name='get_cpda_adv_requests'),
    path('get_cpda_adv_inbox', views.get_leave_inbox, name='get_cpda_adv_inbox'),
    path('get_cpda_adv_archive', views.ViewArchived.as_view(), name='get_cpda_adv_archive'),

    path('get_cpda_claim_requests', views.get_cpda_reim_requests, name='get_cpda_claim_requests'),
    path('get_cpda_claim_inbox', views.get_leave_inbox, name='get_cpda_claim_inbox'),
    path('get_cpda_claim_archive', views.ViewArchived.as_view(), name='get_cpda_claim_archive'),

    path('get_appraisal_requests', views.get_appraisal_requests, name='get_appraisal_requests'),
    path('get_appraisal_inbox', views.get_leave_inbox, name='get_appraisal_inbox'),
    path('get_appraisal_archive', views.ViewArchived.as_view(), name='get_appraisal_archive'),

    path('get_leave_archive', views.ViewArchived.as_view(), name='get_leave_archive'),

    # UC-071 — Cancel Leave
    path('v1/legacy/cancel_leave_form/<int:form_id>/', views.cancel_leave_form, name='cancel_leave_form'),
    # UC-081 — Extension Request
    path('v1/legacy/request_leave_extension/<int:form_id>/', views.request_leave_extension, name='request_leave_extension'),
]
