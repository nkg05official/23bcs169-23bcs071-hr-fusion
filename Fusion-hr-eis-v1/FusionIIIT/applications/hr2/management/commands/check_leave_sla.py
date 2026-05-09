# management/commands/check_leave_sla.py
"""
BR-HR-019 — SLA Escalation Check Management Command

Identifies leave forms that have been in 'submitted' state beyond the SLA
window (default: 3 days) and logs escalation events + optional notifications.

Schedule this as a daily cron job:
    # crontab entry — run every day at 8 AM
    0 8 * * * /path/to/python manage.py check_leave_sla

Usage:
    python manage.py check_leave_sla
    python manage.py check_leave_sla --sla-days 5
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "BR-HR-019 — SLA Escalation Check: "
        "Finds overdue leave forms and logs escalation audit events."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sla-days',
            type=int,
            default=None,
            help=(
                'Override the default SLA window in days. '
                'Defaults to SLA_PENDING_DAYS from services.py.'
            ),
        )

    def handle(self, *args, **options):
        from applications.hr2 import services

        override_days = options.get('sla_days')
        if override_days is not None:
            original_sla = services.SLA_PENDING_DAYS
            services.SLA_PENDING_DAYS = override_days
            self.stdout.write(f"SLA window overridden: {original_sla} → {override_days} days")

        self.stdout.write("Running HR SLA escalation check ...")
        escalated = services.check_sla_and_escalate()

        if escalated:
            self.stdout.write(
                self.style.WARNING(
                    f"  Escalated {len(escalated)} overdue leave form(s): IDs {escalated}"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("  No overdue leave forms found."))

        self.stdout.write(self.style.SUCCESS("SLA check complete."))
