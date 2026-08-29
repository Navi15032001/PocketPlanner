from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone

from django.db import models
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import get_current_balance, get_total_received
from expenses.models import Expense
from income.models import Income
from budgets.models import Budget
from goals.models import Goal
from recurring.utils import process_due_recurring_transactions


class DashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        # Auto-process any due recurring bills & income on dashboard load (Zero manual effort)
        try:
            process_due_recurring_transactions(user)
        except Exception as e:
            print(f"[Recurring Auto-Process Error]: {e}")

        # Current Balance = opening balance + all income - all expenses
        current_balance = get_current_balance(user)

        # Total allocated across active budgets
        total_allocated_budgets = Budget.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('allocated_amount')
        )['total'] or Decimal('0.00')

        # Total money locked/saved in active & completed goals
        total_saved_in_goals = Goal.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('saved_amount')
        )['total'] or Decimal('0.00')

        # Total Reserved = Budgets + Savings Goals
        total_reserved = total_allocated_budgets + total_saved_in_goals

        # This month's activity (for display only)
        today = timezone.localdate()

        expenses_this_month = Expense.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        income_this_month = Income.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        # Available money = Current Balance - (Budgets Allocated + Saved in Goals)
        available_money = current_balance - total_reserved

        # Financial health
        total_ever_received = get_total_received(user)

        if total_ever_received <= 0 and current_balance <= 0:
            financial_health = "NO_DATA"
        elif current_balance < 0:
            financial_health = "CRITICAL"
        elif available_money < 0:
            financial_health = "OVER_ALLOCATED"
        elif current_balance > 0 and available_money < current_balance * Decimal('0.10'):
            financial_health = "LOW"
        elif current_balance > 0 and available_money < current_balance * Decimal('0.30'):
            financial_health = "MODERATE"
        else:
            financial_health = "HEALTHY"

        # Counts
        budget_count = Budget.objects.filter(
            user=user
        ).count()

        expense_count = Expense.objects.filter(
            user=user
        ).count()

        return Response({
            "current_balance": current_balance,
            "reserved_amount": total_reserved,
            "budget_reserved": total_allocated_budgets,
            "savings_reserved": total_saved_in_goals,
            "expenses_this_month": expenses_this_month,
            "income_this_month": income_this_month,
            "available_money": available_money,
            "financial_health": financial_health,
            "budget_count": budget_count,
            "expense_count": expense_count
        })
