# management/commands/year_end_leave_closure.py
"""
UC-101 — Year-End Leave Closure Management Command
BR-HR-027: At the end of each financial year:
  1. Convert unused Vacation Leave (VL) balance to Earned Leave (EL).
  2. Reset Casual Leave balance to annual entitlement.
  3. Log an audit event per employee.

Usage:
    python manage.py year_end_leave_closure
    python manage.py year_end_leave_closure --dry-run
    python manage.py year_end_leave_closure --financial-year 2025-26
"""

import logging
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

logger = logging.getLogger(__name__)

# BR-HR-027: Maximum EL that can be accumulated via VL conversion
MAX_VL_TO_EL_CONVERSION = 30  # days


class Command(BaseCommand):
    help = (
        "UC-101 / BR-HR-027 — Year-End Leave Closure: "
        "Convert unused VL to EL and reset CL balances."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Preview changes without writing to the database.',
        )
        parser.add_argument(
            '--financial-year',
            type=str,
            default=None,
            help='Financial year label to set on updated records (e.g. "2025-26").',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        financial_year = options['financial_year']

        from applications.hr2.models import LeaveBalance, LeavePerYear, Employee
        from applications.hr2.services import audit_event

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be persisted."))

        employees = Employee.objects.all()
        processed = 0
        skipped = 0
        errors = 0

        for employee in employees:
            try:
                with transaction.atomic():
                    balance = LeaveBalance.objects.select_for_update().filter(empid=employee).first()
                    per_year = LeavePerYear.objects.filter(empid=employee).first()

                    if not balance or not per_year:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  SKIP {employee.id.username}: missing LeaveBalance or LeavePerYear."
                            )
                        )
                        skipped += 1
                        continue

                    # BR-HR-027: Convert unused VL → EL (up to MAX_VL_TO_EL_CONVERSION)
                    # VL is stored in earned_leave_balance with a 2x deduction multiplier.
                    # At year end, any remaining VL entitlement is converted 1:1 to EL carryover.
                    # We approximate unused VL as vacation leave balance field.
                    # (VL balance is tracked separately from EL balance per LEAVE_DEDUCTION_RULES)
                    current_el_carryover = balance.earned_leave_carryover
                    # Unused vacation leave is calculated as: per_year.earned_leave - current balance
                    # Since VL maps to earned_leave_balance with 2x multiplier, we skip direct
                    # VL balance and use the carryover mechanism.
                    vl_to_convert = min(MAX_VL_TO_EL_CONVERSION, balance.earned_leave_balance)
                    new_el_carryover = current_el_carryover + vl_to_convert

                    # BR-HR-027: Reset CL to annual entitlement
                    new_casual_balance = per_year.casual_leave

                    self.stdout.write(
                        f"  {employee.id.username}: "
                        f"EL carryover {current_el_carryover} → {new_el_carryover} (+{vl_to_convert}), "
                        f"CL reset to {new_casual_balance}"
                    )

                    if not dry_run:
                        balance.earned_leave_carryover = new_el_carryover
                        balance.casual_leave_balance = new_casual_balance
                        if financial_year:
                            balance.financial_year = financial_year
                        balance.save(update_fields=[
                            'earned_leave_carryover', 'casual_leave_balance', 'financial_year'
                        ])

                        audit_event(
                            'year_end_leave_closure',
                            user=employee.id,
                            object_id=employee.id.id,
                            details={
                                'vl_converted_to_el': vl_to_convert,
                                'new_el_carryover': new_el_carryover,
                                'cl_reset_to': new_casual_balance,
                                'financial_year': financial_year or 'not specified',
                            },
                        )

                    processed += 1

            except Exception as exc:
                logger.error("year_end_leave_closure error for %s: %s", employee, exc)
                self.stderr.write(self.style.ERROR(f"  ERROR {employee}: {exc}"))
                errors += 1

        summary = (
            f"\nYear-End Leave Closure {'(DRY RUN) ' if dry_run else ''}complete. "
            f"Processed: {processed}, Skipped: {skipped}, Errors: {errors}"
        )
        self.stdout.write(self.style.SUCCESS(summary))
