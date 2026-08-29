from decimal import Decimal
from django.db.models import Sum


def get_current_balance(user):
    """
    The core of the balance-based model:
    Current Balance = opening_balance + total money received - total money spent

    Works the same whether the user gets irregular pocket money, a
    monthly salary, freelance payments, or nothing at all this month -
    it's just a running total, not tied to any assumed monthly cycle.
    """
    from expenses.models import Expense
    from income.models import Income
    from accounts.models import UserProfile

    profile, _ = UserProfile.objects.get_or_create(user=user)

    total_income = Income.objects.filter(
        user=user
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_expenses = Expense.objects.filter(
        user=user
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    return profile.opening_balance + total_income - total_expenses


def get_total_received(user):
    """opening_balance + all income ever received - used as the
    denominator for 'what % of money you've ever had have you saved'."""
    from income.models import Income
    from accounts.models import UserProfile

    profile, _ = UserProfile.objects.get_or_create(user=user)

    total_income = Income.objects.filter(
        user=user
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    return profile.opening_balance + total_income
