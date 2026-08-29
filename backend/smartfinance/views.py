import calendar
from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import get_current_balance, get_total_received
from expenses.models import Expense
from income.models import Income
from budgets.models import Budget
from savings.models import Saving
from goals.models import Goal


def _month_bounds(year, month):
    last_day = calendar.monthrange(year, month)[1]
    return last_day


class SpendingPatternView(APIView):
    """
    Compares this month's spending per category against last month's.
    GET /api/smartfinance/spending-pattern/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        this_month = today.month
        this_year = today.year

        if this_month == 1:
            last_month, last_year = 12, this_year - 1
        else:
            last_month, last_year = this_month - 1, this_year

        current = (
            Expense.objects.filter(
                user=user, date__year=this_year, date__month=this_month
            )
            .values('category__id', 'category__name')
            .annotate(total=Sum('amount'))
        )

        previous = (
            Expense.objects.filter(
                user=user, date__year=last_year, date__month=last_month
            )
            .values('category__id', 'category__name')
            .annotate(total=Sum('amount'))
        )

        previous_map = {
            item['category__id']: item['total'] for item in previous
        }

        results = []

        for item in current:
            cat_id = item['category__id']
            cat_name = item['category__name'] or 'Uncategorized'
            current_total = item['total'] or Decimal('0.00')
            previous_total = previous_map.get(cat_id, Decimal('0.00'))

            if previous_total > 0:
                change_percent = round(
                    float((current_total - previous_total) / previous_total * 100), 1
                )
            else:
                change_percent = 100.0 if current_total > 0 else 0.0

            results.append({
                'category': cat_name,
                'current_month_total': current_total,
                'previous_month_total': previous_total,
                'change_percent': change_percent,
            })

        results.sort(key=lambda x: x['current_month_total'], reverse=True)

        return Response(results)


class ExpenseForecastView(APIView):
    """
    Projects this month's total expense based on the daily average so far.
    GET /api/smartfinance/forecast/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        days_elapsed = today.day
        days_in_month = _month_bounds(today.year, today.month)

        spent_so_far = Expense.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        if days_elapsed > 0:
            daily_average = spent_so_far / days_elapsed
        else:
            daily_average = Decimal('0.00')

        projected_total = daily_average * days_in_month

        return Response({
            'days_elapsed': days_elapsed,
            'days_in_month': days_in_month,
            'spent_so_far': spent_so_far,
            'daily_average': round(daily_average, 2),
            'projected_month_total': round(projected_total, 2),
        })


class FinancialHealthScoreView(APIView):
    """
    A 0-100 score based on the user's actual CURRENT BALANCE, not an
    assumed monthly income. Combines: available-balance ratio, budget
    adherence, and how much of all money ever received has been saved.
    GET /api/smartfinance/health-score/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        current_balance = get_current_balance(user)
        total_received = get_total_received(user)

        if total_received <= 0 and current_balance <= 0:
            return Response({
                'score': 0,
                'rating': 'NO_DATA',
                'breakdown': {
                    'balance_health_score': 0,
                    'budget_adherence_score': 0,
                    'savings_rate_score': 0,
                },
                'message': (
                    'Add your opening balance and log some income/expenses '
                    'to get a health score.'
                )
            })

        total_allocated = Budget.objects.filter(
            user=user
        ).aggregate(total=Sum('allocated_amount'))['total'] or Decimal('0.00')

        total_savings = Goal.objects.filter(
            user=user
        ).aggregate(total=Sum('saved_amount'))['total'] or Decimal('0.00')

        available_money = current_balance - (total_allocated + total_savings)

        # 1) Balance health score (40 pts) - how much of your current
        #    balance is still free (not earmarked, not negative)
        if current_balance > 0:
            usage_ratio = max(0.0, float(available_money / current_balance))
        else:
            usage_ratio = 0.0

        balance_health_score = max(0, min(40, round(40 * min(usage_ratio / 0.30, 1))))

        # 2) Budget adherence score (30 pts) - any budget allocated above
        #    its own target is a red flag
        budget_total = Budget.objects.filter(user=user).count()

        budget_adherence_score = 30 if budget_total == 0 else 30 - min(
            30,
            Budget.objects.filter(
                user=user, allocated_amount__gt=models.F('target_amount')
            ).count() * 10
        )

        # 3) Savings rate score (30 pts) - what % of all money you've
        #    ever received (opening balance + income) have you saved
        savings_ratio = float(total_savings / total_received) if total_received else 0
        savings_rate_score = max(0, min(30, round(30 * min(savings_ratio / 0.20, 1))))

        total_score = balance_health_score + budget_adherence_score + savings_rate_score
        total_score = max(0, min(100, total_score))

        if total_score >= 80:
            rating = 'EXCELLENT'
        elif total_score >= 60:
            rating = 'GOOD'
        elif total_score >= 40:
            rating = 'FAIR'
        elif total_score >= 20:
            rating = 'NEEDS_ATTENTION'
        else:
            rating = 'CRITICAL'

        return Response({
            'score': total_score,
            'rating': rating,
            'breakdown': {
                'balance_health_score': balance_health_score,
                'budget_adherence_score': budget_adherence_score,
                'savings_rate_score': savings_rate_score,
            }
        })


class SmartSuggestionsView(APIView):
    """
    Rule-based, plain-English suggestions - no ML, just checks against
    thresholds, all based on actual balance rather than assumed income.
    GET /api/smartfinance/suggestions/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        suggestions = []

        current_balance = get_current_balance(user)
        total_received = get_total_received(user)

        if total_received <= 0 and current_balance <= 0:
            suggestions.append(
                "Add your opening balance in Settings and log some income "
                "or expenses so PocketPlanner can give you suggestions."
            )
            return Response(suggestions)

        if current_balance < 0:
            suggestions.append(
                "Your current balance has gone negative - you've spent more "
                "than you've received so far. Consider reviewing recent "
                "expenses."
            )

        # Category spike detection (reuses the spending-pattern logic)
        pattern_view = SpendingPatternView()
        pattern_data = pattern_view.get(request).data

        for item in pattern_data:
            if item['change_percent'] >= 30 and item['current_month_total'] > 0:
                suggestions.append(
                    f"Spending on '{item['category']}' is up "
                    f"{item['change_percent']}% compared to last month."
                )

        total_savings = Goal.objects.filter(
            user=user
        ).aggregate(total=Sum('saved_amount'))['total'] or Decimal('0.00')

        savings_ratio = float(total_savings / total_received) if total_received else 0

        if savings_ratio < 0.10:
            suggestions.append(
                "You're saving less than 10% of the money you've received "
                "overall. Even a small transfer to a savings goal helps "
                "build momentum."
            )

        over_target_budgets = Budget.objects.filter(
            user=user,
            allocated_amount__gt=models.F('target_amount')
        )

        for budget in over_target_budgets:
            suggestions.append(
                f"Your '{budget.name}' budget is allocated above its target "
                f"amount - you may want to revisit it."
            )

        if not suggestions:
            suggestions.append(
                "You're on track - no immediate concerns found."
            )

        return Response(suggestions)


class MonthlySummaryView(APIView):
    """
    GET /api/smartfinance/monthly-summary/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()

        total_income = Income.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_expenses = Expense.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        total_savings = Saving.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        net = total_income - total_expenses - total_savings

        return Response({
            'month': today.strftime('%Y-%m'),
            'total_income': total_income,
            'total_expenses': total_expenses,
            'total_savings': total_savings,
            'net': net,
            'current_balance': get_current_balance(user),
        })
