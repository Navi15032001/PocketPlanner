import calendar
from datetime import date
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

from .models import Budget, BudgetDailyLog
from .serializers import BudgetSerializer, BudgetDailyLogSerializer


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
        1-Tap Spend from Budget Envelope.
        """
        budget = self.get_object()
        raw_amount = request.data.get('amount')
        description = request.data.get('description', '')

        if not raw_amount:
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
            expense = Expense.objects.create(
                user=request.user,
                category=budget.category,
                amount=spend_amount,
                description=expense_desc,
                date=today
            )

            budget.allocated_amount = max(Decimal('0.00'), budget.allocated_amount - spend_amount)
            budget.save(update_fields=['allocated_amount'])

            # Also mark today's cell as SPENT if budget is daily
            if budget.period == 'DAILY':
                log, _ = BudgetDailyLog.objects.get_or_create(budget=budget, date=today)
                log.status = 'SPENT'
                log.amount = spend_amount
                log.expense = expense
                log.note = expense_desc
                log.save()

        return Response({
            'detail': f"Successfully logged ₹{spend_amount:,.2f} expense from '{budget.name}' budget.",
            'budget_id': budget.id,
            'budget_name': budget.name,
            'amount_spent': spend_amount,
            'remaining_allocated': budget.allocated_amount,
            'expense_id': expense.id
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='matrix')
    def get_matrix(self, request):
        """
        Returns full monthly matrix attendance sheet for all budgets:
        - Daily budgets: day 1..total_days breakdown with SPENT/SKIPPED/PENDING cell states.
        - Monthly budgets: full-month aggregate block.
        """
        today = timezone.localdate()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))

        _, total_days = calendar.monthrange(year, month)
        budgets = Budget.objects.filter(user=request.user).order_by('-priority', 'created_at')

        # Pre-fetch all daily logs for this month
        start_date = date(year, month, 1)
        end_date = date(year, month, total_days)

        daily_logs = BudgetDailyLog.objects.filter(
            budget__in=budgets,
            date__range=(start_date, end_date)
        )

        logs_by_budget = {}
        for log in daily_logs:
            if log.budget_id not in logs_by_budget:
                logs_by_budget[log.budget_id] = {}
            logs_by_budget[log.budget_id][log.date.day] = {
                'status': log.status,
                'amount': float(log.amount),
                'note': log.note,
                'expense_id': log.expense_id
            }

        matrix_rows = []
        for b in budgets:
            b_logs = logs_by_budget.get(b.id, {})
            row = {
                'id': b.id,
                'name': b.name,
                'period': b.period,
                'priority': b.priority,
                'target_amount': float(b.target_amount),
                'allocated_amount': float(b.allocated_amount),
                'category_name': b.category.name if b.category else None,
                'cells': {},
                'total_spent': 0.0,
                'total_skipped': 0.0,
                'spent_days_count': 0,
                'skipped_days_count': 0
            }

            if b.period == 'DAILY':
                for day in range(1, total_days + 1):
                    day_info = b_logs.get(day, {'status': 'PENDING', 'amount': 0.0, 'note': '', 'expense_id': None})
                    row['cells'][str(day)] = day_info
                    if day_info['status'] == 'SPENT':
                        row['total_spent'] += float(day_info.get('amount') or b.target_amount)
                        row['spent_days_count'] += 1
                    elif day_info['status'] == 'SKIPPED':
                        row['total_skipped'] += float(b.target_amount)
                        row['skipped_days_count'] += 1
            else:
                # Monthly / Weekly: Full month single cell
                monthly_status = 'PENDING'
                if b.allocated_amount <= 0:
                    monthly_status = 'SPENT'
                row['monthly_status'] = monthly_status

            matrix_rows.append(row)

        return Response({
            'year': year,
            'month': month,
            'month_name': calendar.month_name[month],
            'total_days': total_days,
            'today_day': today.day if (today.year == year and today.month == month) else None,
            'matrix': matrix_rows
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cell-toggle')
    def toggle_cell(self, request, pk=None):
        """
        Interactive cell toggle:
        Accepts: date (YYYY-MM-DD), target_status (SPENT, SKIPPED, PENDING), amount (optional).
        - SPENT: creates expense, deducts allocated amount.
        - SKIPPED: removes expense if any, marks skipped (frees funds).
        - PENDING: clears log and expense.
        """
        budget = self.get_object()
        raw_date = request.data.get('date')
        new_status = request.data.get('status', 'SPENT').upper()
        custom_amount = request.data.get('amount')

        if not raw_date:
            return Response({'detail': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cell_date = timezone.datetime.strptime(raw_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        spend_amount = Decimal(str(custom_amount)) if custom_amount else budget.target_amount

        with transaction.atomic():
            log, _ = BudgetDailyLog.objects.get_or_create(budget=budget, date=cell_date)
            old_status = log.status

            if new_status == 'SPENT':
                if not log.expense:
                    expense = Expense.objects.create(
                        user=request.user,
                        category=budget.category,
                        amount=spend_amount,
                        description=f"Spent from budget ({budget.name}) for {cell_date}",
                        date=cell_date
                    )
                    log.expense = expense
                else:
                    log.expense.amount = spend_amount
                    log.expense.save()

                log.status = 'SPENT'
                log.amount = spend_amount
                log.save()

                if old_status != 'SPENT':
                    budget.allocated_amount = max(Decimal('0.00'), budget.allocated_amount - spend_amount)
                    budget.save(update_fields=['allocated_amount'])

            elif new_status == 'SKIPPED':
                if log.expense:
                    log.expense.delete()
                    log.expense = None

                log.status = 'SKIPPED'
                log.amount = Decimal('0.00')
                log.save()

                # If previously spent, restore allocation
                if old_status == 'SPENT':
                    budget.allocated_amount = min(budget.target_amount, budget.allocated_amount + spend_amount)
                    budget.save(update_fields=['allocated_amount'])

            else:  # PENDING
                if log.expense:
                    log.expense.delete()
                    log.expense = None
                log.status = 'PENDING'
                log.amount = Decimal('0.00')
                log.save()

        return Response({
            'detail': f"Cell for {cell_date} updated to {new_status}.",
            'budget_id': budget.id,
            'date': raw_date,
            'status': new_status,
            'allocated_amount': budget.allocated_amount
        }, status=status.HTTP_200_OK)
