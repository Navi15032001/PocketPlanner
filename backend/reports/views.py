from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncMonth

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from expenses.models import Expense
from savings.models import Saving
from budgets.models import Budget


class MonthlyReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        expense_data = (
            Expense.objects
            .filter(user=user)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )

        expense_by_month = {
            item['month'].strftime('%Y-%m'): item['total']
            for item in expense_data
        }

        report = []

        for month, expense in expense_by_month.items():

            report.append({
                'month': month,
                'expense': expense,
            })

        return Response(report)


class CategoryExpenseReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        data = (
            Expense.objects
            .filter(user=user)
            .values(
                'category__id',
                'category__name'
            )
            .annotate(
                total=Sum('amount')
            )
            .order_by('-total')
        )

        return Response([
            {
                'category_id': item['category__id'],
                'category': item['category__name'],
                'total': item['total']
            }
            for item in data
        ])


class SavingsReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        total_savings = (
            Saving.objects
            .filter(user=user)
            .aggregate(
                total=Sum('amount')
            )['total']
            or Decimal('0.00')
        )

        return Response({
            'total_savings': total_savings
        })


class BudgetReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        budgets = Budget.objects.filter(
            user=user
        )

        result = []

        for budget in budgets:

            result.append({
                'budget_id': budget.id,
                'name': budget.name,
                'allocated_amount': budget.allocated_amount,
                'priority': budget.priority,
            })

        return Response(result)