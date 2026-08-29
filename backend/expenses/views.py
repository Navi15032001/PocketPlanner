import csv
import io
from decimal import Decimal, InvalidOperation

from django.db import models
from django.db.models import Sum

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser

from accounts.utils import get_current_balance, get_total_received

from .models import Expense
from .serializers import ExpenseSerializer

from budgets.models import Budget
from categories.models import Category
from income.models import Income
from goals.models import Goal


class ExpenseViewSet(viewsets.ModelViewSet):

    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(
            user=self.request.user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='spending-summary')
    def spending_summary(self, request):

        user = request.user

        current_balance = get_current_balance(user)

        total_allocated = Budget.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('allocated_amount')
        )['total'] or Decimal('0.00')

        total_saved = Goal.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('saved_amount')
        )['total'] or Decimal('0.00')

        total_expenses = Expense.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')

        total_reserved = total_allocated + total_saved

        # Available money = current balance minus total reserved (budgets + goals)
        available_money = current_balance - total_reserved

        return Response({
            'current_balance': current_balance,
            'total_allocated': total_allocated,
            'total_saved': total_saved,
            'total_reserved': total_reserved,
            'total_expenses': total_expenses,
            'available_money': available_money
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='financial-health')
    def financial_health(self, request):

        user = request.user

        current_balance = get_current_balance(user)

        total_allocated = Budget.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('allocated_amount')
        )['total'] or Decimal('0.00')

        total_saved = Goal.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('saved_amount')
        )['total'] or Decimal('0.00')

        total_expenses = Expense.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')

        total_reserved = total_allocated + total_saved
        available_money = current_balance - total_reserved

        total_ever_received = get_total_received(user)

        if total_ever_received <= 0 and current_balance <= 0:
            health = "NO_DATA"
        elif current_balance < 0:
            health = "CRITICAL"
        elif available_money < 0:
            health = "OVER_ALLOCATED"
        elif current_balance > 0 and available_money < current_balance * Decimal('0.10'):
            health = "LOW"
        elif current_balance > 0 and available_money < current_balance * Decimal('0.30'):
            health = "MODERATE"
        else:
            health = "HEALTHY"

        return Response({
            'current_balance': current_balance,
            'reserved_amount': total_reserved,
            'total_expenses': total_expenses,
            'available_money': available_money,
            'financial_health': health
        }, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=['post'],
        url_path='import-csv',
        parser_classes=[MultiPartParser]
    )
    def import_csv(self, request):
        """
        Expects a multipart/form-data POST with a 'file' field.
        CSV columns (header row required, case-insensitive):
        date, category, amount, description
        """

        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {'detail': "No file uploaded. Send it as 'file' in form-data."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded = uploaded_file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response(
                {'detail': "Could not read file. Please upload a UTF-8 CSV."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reader = csv.DictReader(io.StringIO(decoded))
        reader.fieldnames = [
            (f or '').strip().lower() for f in (reader.fieldnames or [])
        ]

        required = {'date', 'amount'}
        if not required.issubset(set(reader.fieldnames)):
            return Response(
                {'detail': "CSV must have at least 'date' and 'amount' columns."},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        errors = []

        category_cache = {
            c.name.lower(): c
            for c in Category.objects.filter(user=request.user)
        }

        for row_number, row in enumerate(reader, start=2):

            date_str = (row.get('date') or '').strip()
            amount_str = (row.get('amount') or '').strip()
            category_name = (row.get('category') or '').strip()
            description = (row.get('description') or '').strip()

            if not date_str or not amount_str:
                errors.append(f"Row {row_number}: missing date or amount, skipped.")
                continue

            try:
                amount = Decimal(amount_str)
                if amount <= 0:
                    raise InvalidOperation
            except InvalidOperation:
                errors.append(f"Row {row_number}: invalid amount '{amount_str}', skipped.")
                continue

            category = None
            if category_name:
                key = category_name.lower()
                if key in category_cache:
                    category = category_cache[key]
                else:
                    category = Category.objects.create(
                        user=request.user,
                        name=category_name
                    )
                    category_cache[key] = category

            try:
                Expense.objects.create(
                    user=request.user,
                    category=category,
                    amount=amount,
                    description=description,
                    date=date_str
                )
                created_count += 1
            except Exception as exc:
                errors.append(f"Row {row_number}: {exc}")

        return Response({
            'created': created_count,
            'errors': errors
        }, status=status.HTTP_200_OK)
