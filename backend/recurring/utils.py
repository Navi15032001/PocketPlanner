from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.utils import timezone

from expenses.models import Expense
from income.models import Income
from notifications.models import Notification
from .models import RecurringTransaction


def advance_recurring_date(current_date, frequency):
    if frequency == 'DAILY':
        return current_date + timedelta(days=1)
    if frequency == 'WEEKLY':
        return current_date + timedelta(weeks=1)
    if frequency == 'MONTHLY':
        return current_date + relativedelta(months=1)
    if frequency == 'YEARLY':
        return current_date + relativedelta(years=1)
    return current_date


def process_due_recurring_transactions(user):
    """
    Finds all active recurring transactions due today (or earlier)
    for the given user, automatically creates the actual Expense or Income
    entry, pushes next_due_date forward, and generates a notification alert.
    Can be invoked automatically on dashboard load or via background task.
    """
    today = timezone.localdate()
    due_items = RecurringTransaction.objects.filter(
        user=user,
        is_active=True,
        next_due_date__lte=today
    )

    if not due_items.exists():
        return 0

    created_count = 0

    with transaction.atomic():
        for item in due_items:
            if item.transaction_type == 'EXPENSE':
                Expense.objects.create(
                    user=item.user,
                    category=item.category,
                    amount=item.amount,
                    description=f"{item.title} (recurring auto-log)",
                    date=item.next_due_date,
                )
            else:
                Income.objects.create(
                    user=item.user,
                    title=item.title,
                    amount=item.amount,
                    income_type='OTHER',
                    date=item.next_due_date,
                    description=f"{item.title} (recurring auto-log)",
                )

            if item.reminder_enabled:
                Notification.objects.create(
                    user=item.user,
                    type='RECURRING_DUE',
                    title=f"{item.title} Auto-Processed",
                    message=(
                        f"Recurring {item.transaction_type.lower()} '{item.title}' "
                        f"of ₹{item.amount} was automatically logged on {item.next_due_date}."
                    ),
                )

            # Advance next_due_date
            item.next_due_date = advance_recurring_date(
                item.next_due_date, item.frequency
            )
            item.save(update_fields=['next_due_date'])
            created_count += 1

    return created_count
