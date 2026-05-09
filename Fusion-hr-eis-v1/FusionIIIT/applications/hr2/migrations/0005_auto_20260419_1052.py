import datetime
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.db.models.expressions


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('globals', '0005_moduleaccess_database'),
        ('hr2', '0003_auto_20250413_1550'),
    ]

    operations = [
        migrations.CreateModel(
            name='ApprovalHierarchy',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('form_type', models.CharField(choices=[('leave', 'Leave Application'), ('ltc', 'LTC Claim'), ('cpda_advance', 'CPDA Advance'), ('cpda_reimbursement', 'CPDA Reimbursement'), ('appraisal', 'Appraisal')], max_length=50)),
                ('leave_type', models.CharField(blank=True, max_length=50, null=True)),
                ('approval_level', models.IntegerField(choices=[(1, 'Department Head (HoD)'), (2, 'Administrative Handler'), (3, 'Sanctioning Authority (Director/Principal)'), (4, 'Finance/Accounts'), (5, 'HR Final Approval')])),
                ('min_amount_limit', models.DecimalField(blank=True, decimal_places=2, help_text='Minimum amount for this level to approve', max_digits=12, null=True)),
                ('max_amount_limit', models.DecimalField(blank=True, decimal_places=2, help_text='Maximum amount for this level to approve', max_digits=12, null=True)),
                ('sla_days', models.IntegerField(default=5, help_text='Days allowed for approval')),
                ('can_reject', models.BooleanField(default=True)),
                ('can_forward', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='ErrorLog',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('error_code', models.CharField(db_index=True, max_length=50)),
                ('error_message', models.TextField()),
                ('error_type', models.CharField(max_length=100)),
                ('severity', models.CharField(choices=[('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('CRITICAL', 'Critical')], default='MEDIUM', max_length=20)),
                ('module', models.CharField(max_length=50)),
                ('function', models.CharField(max_length=100)),
                ('line_number', models.IntegerField(blank=True, null=True)),
                ('request_path', models.CharField(blank=True, max_length=500, null=True)),
                ('request_method', models.CharField(blank=True, max_length=10, null=True)),
                ('stack_trace', models.TextField(blank=True, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('resolved', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name_plural': 'Error Logs',
            },
        ),
        migrations.CreateModel(
            name='LeaveFormApprovalStep',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('step_number', models.IntegerField()),
                ('assigned_date', models.DateTimeField(auto_now_add=True)),
                ('due_date', models.DateTimeField()),
                ('response_date', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected'), ('forwarded', 'Forwarded'), ('escalated', 'Escalated - SLA Breach')], default='pending', max_length=20)),
                ('remarks', models.TextField(blank=True, null=True)),
                ('escalation_count', models.IntegerField(default=0)),
                ('last_escalation_date', models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='LeaveFormAuditLog',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('create', 'Create'), ('update', 'Update'), ('approve', 'Approve'), ('reject', 'Reject'), ('balance_deduction', 'Balance Deduction'), ('substitute_request', 'Substitute Request'), ('substitute_response', 'Substitute Response')], max_length=50)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('old_values', models.JSONField(blank=True, null=True)),
                ('new_values', models.JSONField(blank=True, null=True)),
                ('remarks', models.TextField(blank=True, null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=500, null=True)),
            ],
            options={
                'verbose_name_plural': 'Leave Form Audit Logs',
            },
        ),
        migrations.CreateModel(
            name='SubstituteRequest',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('request_date', models.DateTimeField(auto_now_add=True)),
                ('reason_for_substitution', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending - Awaiting Substitute Response'), ('accepted', 'Accepted - Substitute Confirmed'), ('rejected', 'Rejected - Substitute Declined'), ('cancelled', 'Cancelled - By Employee or System')], default='pending', max_length=20)),
                ('response_date', models.DateTimeField(blank=True, null=True)),
                ('response_remarks', models.TextField(blank=True, null=True)),
            ],
        ),
        migrations.AlterModelOptions(
            name='leaveform',
            options={'verbose_name': 'Leave Form', 'verbose_name_plural': 'Leave Forms'},
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='casual_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='child_care_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='earned_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='half_pay_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='leave_encashment_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='maternity_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='paternity_leave_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='restricted_holiday_taken',
        ),
        migrations.RemoveField(
            model_name='leavebalance',
            name='special_casual_leave_taken',
        ),
        migrations.AddField(
            model_name='appraisalform',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='appraisalform',
            name='employee',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='appraisals', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='appraisalform',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='cpdaadvanceform',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='cpdaadvanceform',
            name='employee',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cpda_advances', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='cpdaadvanceform',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='cpdareimbursementform',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='cpdareimbursementform',
            name='employee',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cpda_reimbursements', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='cpdareimbursementform',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='casual_leave_balance',
            field=models.IntegerField(default=8, help_text='Available casual leave (cannot be negative)'),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='casual_leave_carryover',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='child_care_leave_balance',
            field=models.IntegerField(default=730),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='earned_leave_balance',
            field=models.IntegerField(default=15),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='earned_leave_carryover',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='financial_year',
            field=models.CharField(default='2025-26', max_length=10),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='half_pay_leave_balance',
            field=models.IntegerField(default=15),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='last_updated',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='leave_encashment_balance',
            field=models.IntegerField(default=60),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='maternity_leave_balance',
            field=models.IntegerField(default=180),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='paternity_leave_balance',
            field=models.IntegerField(default=15),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='restricted_holiday_balance',
            field=models.IntegerField(default=2),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='special_casual_leave_balance',
            field=models.IntegerField(default=15),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='total_casual_leave',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='leavebalance',
            name='total_earned_leave',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='leaveform',
            name='balance_deducted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='leaveform',
            name='balance_deduction_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='leaveform',
            name='state',
            field=models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted - Awaiting HoD'), ('hod_approved', 'HoD Approved - Awaiting Admin'), ('hod_rejected', 'HoD Rejected'), ('admin_approved', 'Admin Approved - Awaiting Sanction'), ('admin_rejected', 'Admin Rejected'), ('sanction_approved', 'Sanctioning Authority Approved'), ('sanction_rejected', 'Sanctioning Authority Rejected'), ('final_approved', 'Final Approved - Balance Deducted'), ('cancelled', 'Cancelled'), ('withdrawn', 'Withdrawn')], db_index=True, default='draft', max_length=50),
        ),
        migrations.AddField(
            model_name='leaveform',
            name='version',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='ltcform',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='ltcform',
            name='employee',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ltc_claims', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='ltcform',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AlterField(
            model_name='cpdaadvanceform',
            name='amountRequired',
            field=models.DecimalField(decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AlterField(
            model_name='leaveform',
            name='application_type',
            field=models.CharField(choices=[('Online', 'Online'), ('Offline', 'Offline')], db_index=True, default='Online', max_length=10),
        ),
        migrations.AlterField(
            model_name='leaveform',
            name='leaveEndDate',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name='leaveform',
            name='leaveStartDate',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name='leaveform',
            name='submissionDate',
            field=models.DateField(db_index=True, default=datetime.date.today),
        ),
        migrations.AlterField(
            model_name='ltcform',
            name='leaveEndDate',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name='ltcform',
            name='leaveStartDate',
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AddIndex(
            model_name='appraisalform',
            index=models.Index(fields=['employee', 'approved'], name='hr2_apprais_employe_4c55e8_idx'),
        ),
        migrations.AddIndex(
            model_name='appraisalform',
            index=models.Index(fields=['created_by', 'created_at'], name='hr2_apprais_created_e5279d_idx'),
        ),
        migrations.AddIndex(
            model_name='cpdaadvanceform',
            index=models.Index(fields=['employee', 'approved'], name='hr2_cpdaadv_employe_d8a285_idx'),
        ),
        migrations.AddIndex(
            model_name='cpdaadvanceform',
            index=models.Index(fields=['created_by', 'created_at'], name='hr2_cpdaadv_created_f3de95_idx'),
        ),
        migrations.AddIndex(
            model_name='cpdareimbursementform',
            index=models.Index(fields=['employee', 'approved'], name='hr2_cpdarei_employe_896d15_idx'),
        ),
        migrations.AddIndex(
            model_name='cpdareimbursementform',
            index=models.Index(fields=['created_by', 'created_at'], name='hr2_cpdarei_created_a4b89b_idx'),
        ),
        migrations.AddIndex(
            model_name='leavebalance',
            index=models.Index(fields=['financial_year'], name='hr2_leaveba_financi_fbf487_idx'),
        ),
        migrations.AddIndex(
            model_name='leavebalance',
            index=models.Index(fields=['empid', 'financial_year'], name='hr2_leaveba_empid_i_9b7e92_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveform',
            index=models.Index(fields=['employee', 'state'], name='hr2_leavefo_employe_a596cc_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveform',
            index=models.Index(fields=['employee', 'leaveStartDate', 'leaveEndDate'], name='hr2_leavefo_employe_807874_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveform',
            index=models.Index(fields=['state', 'submissionDate'], name='hr2_leavefo_state_54a625_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveform',
            index=models.Index(fields=['approved_by', 'state'], name='hr2_leavefo_approve_cf21bc_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveform',
            index=models.Index(fields=['balance_deducted', 'state'], name='hr2_leavefo_balance_c4f7e3_idx'),
        ),
        migrations.AddIndex(
            model_name='ltcform',
            index=models.Index(fields=['employee', 'blockYear'], name='hr2_ltcform_employe_17b404_idx'),
        ),
        migrations.AddIndex(
            model_name='ltcform',
            index=models.Index(fields=['created_by', 'created_at'], name='hr2_ltcform_created_debac6_idx'),
        ),
        migrations.AddConstraint(
            model_name='cpdaadvanceform',
            constraint=models.CheckConstraint(check=models.Q(('amountRequired__gte', 0), ('amountRequired__isnull', True), _connector='OR'), name='cpda_amount_positive'),
        ),
        migrations.AddConstraint(
            model_name='leavebalance',
            constraint=models.CheckConstraint(check=models.Q(casual_leave_balance__gte=0), name='casual_leave_non_negative'),
        ),
        migrations.AddConstraint(
            model_name='leavebalance',
            constraint=models.CheckConstraint(check=models.Q(earned_leave_balance__gte=0), name='earned_leave_non_negative'),
        ),
        migrations.AddConstraint(
            model_name='leavebalance',
            constraint=models.CheckConstraint(check=models.Q(half_pay_leave_balance__gte=0), name='half_pay_leave_non_negative'),
        ),
        migrations.AddConstraint(
            model_name='leaveform',
            constraint=models.CheckConstraint(check=models.Q(('LeavingStation', False), models.Q(('Address_During_StationLeave__gt', ''), ('Address_During_StationLeave__isnull', False)), _connector='OR'), name='station_leave_requires_address'),
        ),
        migrations.AddConstraint(
            model_name='ltcform',
            constraint=models.CheckConstraint(check=models.Q(('leaveEndDate__gte', django.db.models.expressions.F('leaveStartDate')), ('leaveStartDate__isnull', True), _connector='OR'), name='ltc_leave_end_after_start'),
        ),
        migrations.AddField(
            model_name='substituterequest',
            name='created_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitute_requests_created', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='substituterequest',
            name='leave_form',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='substitute_requests', to='hr2.leaveform'),
        ),
        migrations.AddField(
            model_name='substituterequest',
            name='requesting_employee',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='substitute_requests_sent', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='substituterequest',
            name='substitute_employee',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='substitute_requests_received', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='leaveformauditlog',
            name='leave_form',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='hr2.leaveform'),
        ),
        migrations.AddField(
            model_name='leaveformauditlog',
            name='performed_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='leaveformapprovalstep',
            name='approval_hierarchy',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='hr2.approvalhierarchy'),
        ),
        migrations.AddField(
            model_name='leaveformapprovalstep',
            name='assigned_to',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='leave_approvals_assigned', to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='leaveformapprovalstep',
            name='leave_form',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_steps', to='hr2.leaveform'),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='employee',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='hr2.employee'),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='leave_form',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='hr2.leaveform'),
        ),
        migrations.AddField(
            model_name='errorlog',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='approvalhierarchy',
            name='department',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='globals.departmentinfo'),
        ),
        migrations.AddField(
            model_name='approvalhierarchy',
            name='required_designation',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_hierarchies', to='globals.designation'),
        ),
        migrations.AddIndex(
            model_name='substituterequest',
            index=models.Index(fields=['status', 'leave_form'], name='hr2_substit_status_cb5792_idx'),
        ),
        migrations.AddIndex(
            model_name='substituterequest',
            index=models.Index(fields=['substitute_employee', 'status'], name='hr2_substit_substit_547d4c_idx'),
        ),
        migrations.AddConstraint(
            model_name='substituterequest',
            constraint=models.UniqueConstraint(fields=('leave_form', 'substitute_employee'), name='unique_substitute_per_leave'),
        ),
        migrations.AddIndex(
            model_name='leaveformauditlog',
            index=models.Index(fields=['leave_form', 'timestamp'], name='hr2_leavefo_leave_f_d6583f_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveformauditlog',
            index=models.Index(fields=['performed_by', 'action'], name='hr2_leavefo_perform_cae663_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveformauditlog',
            index=models.Index(fields=['timestamp', 'action'], name='hr2_leavefo_timesta_d5fa41_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveformapprovalstep',
            index=models.Index(fields=['leave_form', 'step_number'], name='hr2_leavefo_leave_f_1a128d_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveformapprovalstep',
            index=models.Index(fields=['assigned_to', 'status'], name='hr2_leavefo_assigne_5ce45e_idx'),
        ),
        migrations.AddIndex(
            model_name='leaveformapprovalstep',
            index=models.Index(fields=['due_date', 'status'], name='hr2_leavefo_due_dat_736bae_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='leaveformapprovalstep',
            unique_together={('leave_form', 'step_number')},
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['error_code', 'severity'], name='hr2_errorlo_error_c_e004c9_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['timestamp', 'resolved'], name='hr2_errorlo_timesta_65be63_idx'),
        ),
        migrations.AddIndex(
            model_name='errorlog',
            index=models.Index(fields=['user', 'timestamp'], name='hr2_errorlo_user_id_fb43c0_idx'),
        ),
        migrations.AddIndex(
            model_name='approvalhierarchy',
            index=models.Index(fields=['form_type', 'approval_level'], name='hr2_approva_form_ty_6790d1_idx'),
        ),
        migrations.AddIndex(
            model_name='approvalhierarchy',
            index=models.Index(fields=['required_designation', 'is_active'], name='hr2_approva_require_0dd93c_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='approvalhierarchy',
            unique_together={('form_type', 'leave_type', 'approval_level', 'department')},
        ),
    ]
