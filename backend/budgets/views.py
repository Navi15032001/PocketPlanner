from decimal import Decimal
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import get_current_balance
from goals.models import Goal

from .models import Budget
from .serializers import BudgetSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)

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
