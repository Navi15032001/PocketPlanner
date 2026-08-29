from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import get_current_balance
from goals.models import Goal
from expenses.models import Expense

from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).order_by('-priority', 'created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='allocate')
    def allocate(self, request):
        """
        Allocates the user's CURRENT UNRESERVED BALANCE (current balance minus
        funds already locked/saved in active goals) across budgets by priority.
        Safeguards emergency funds and savings goals from being re-allocated.
        """
        balance = get_current_balance(request.user)

        total_saved_in_goals = Goal.objects.filter(
            user=request.user
        ).aggregate(
            total=models.Sum('saved_amount')
        )['total'] or Decimal('0.00')

        available_for_budgets = max(Decimal('0.00'), balance - total_saved_in_goals)

        budgets = Budget.objects.filter(
            user=request.user
        ).order_by(
            '-priority',
            'created_at'
        )

        remaining = available_for_budgets
        total_allocated = 0

        priority_order = {
            'HIGH': 3,
            'MEDIUM': 2,
            'LOW': 1
        }

        budgets = sorted(
            budgets,
            key=lambda budget: priority_order[budget.priority],
            reverse=True
        )

        for budget in budgets:
            if remaining <= 0:
                budget.allocated_amount = 0
                budget.save(update_fields=['allocated_amount'])
                continue

            amount_needed = budget.target_amount

            allocation = min(
                remaining,
                amount_needed
            )

            budget.allocated_amount = allocation
            budget.save(update_fields=['allocated_amount'])

            remaining -= allocation
            total_allocated += allocation

        return Response({
            'balance': balance,
            'saved_in_goals': total_saved_in_goals,
            'allocated': total_allocated,
            'available': remaining
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='spend')
    def spend(self, request, pk=None):
        """
        1-Tap Spend from Budget Envelope:
        - Automatically creates an Expense record.
        - Deducts the spent amount from the budget's allocated envelope.
        - Automatically reduces Total Reserved and updates Available Cash.
        """
        budget = self.get_object()
        raw_amount = request.data.get('amount')
        description = request.data.get('description', '')

        if not raw_amount:
            # Default to full remaining allocated amount or budget target
            spend_amount = budget.allocated_amount if budget.allocated_amount > 0 else budget.target_amount
        else:
            try:
                spend_amount = Decimal(str(raw_amount))
                if spend_amount <= 0:
                    return Response(
                        {'detail': 'Spend amount must be greater than zero.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception:
                return Response(
                    {'detail': 'Invalid spend amount format.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        today = timezone.localdate()
        expense_desc = description.strip() if description else f"Spent from budget: {budget.name}"

        with transaction.atomic():
            # 1. Log the Expense
            expense = Expense.objects.create(
                user=request.user,
                category=budget.category,
                amount=spend_amount,
                description=expense_desc,
                date=today
            )

            # 2. Deduct from allocated envelope
            budget.allocated_amount = max(Decimal('0.00'), budget.allocated_amount - spend_amount)
            budget.save(update_fields=['allocated_amount'])

        return Response({
            'detail': f"Successfully logged ₹{spend_amount:,.2f} expense from '{budget.name}' budget.",
            'budget_id': budget.id,
            'budget_name': budget.name,
            'amount_spent': spend_amount,
            'remaining_allocated': budget.allocated_amount,
            'expense_id': expense.id
        }, status=status.HTTP_200_OK)
