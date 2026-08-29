from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import UserProfile
from expenses.models import Expense
from income.models import Income
from budgets.models import Budget
from goals.models import Goal


class DashboardCalculationsTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="dashuser",
            email="dash@example.com",
            password="testpassword123"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            opening_balance=Decimal("20000.00"),
            currency="INR"
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_metrics_and_health(self):
        today = timezone.localdate()

        # Add Income
        Income.objects.create(
            user=self.user,
            title="Freelance",
            income_type="FREELANCE",
            amount=Decimal("10000.00"),
            date=today
        )

        # Add Expense
        Expense.objects.create(
            user=self.user,
            amount=Decimal("5000.00"),
            date=today,
            description="Laptop"
        )

        # Add Budget with allocation of 5,000
        Budget.objects.create(
            user=self.user,
            name="Groceries",
            target_amount=Decimal("5000.00"),
            allocated_amount=Decimal("5000.00"),
            priority="HIGH"
        )

        # Add Savings Goal with 3,000 saved in Emergency Fund
        Goal.objects.create(
            user=self.user,
            name="Emergency Fund",
            target_amount=Decimal("10000.00"),
            saved_amount=Decimal("3000.00"),
            status="ACTIVE"
        )

        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Current Balance = 20,000 opening + 10,000 income - 5,000 expense = 25,000
        self.assertEqual(Decimal(str(response.data['current_balance'])), Decimal('25000.00'))

        # Reserved Amount = 5,000 (budget) + 3,000 (emergency fund goal) = 8,000
        self.assertEqual(Decimal(str(response.data['reserved_amount'])), Decimal('8000.00'))
        self.assertEqual(Decimal(str(response.data['budget_reserved'])), Decimal('5000.00'))
        self.assertEqual(Decimal(str(response.data['savings_reserved'])), Decimal('3000.00'))

        # Available Money = 25,000 - 8,000 = 17,000
        self.assertEqual(Decimal(str(response.data['available_money'])), Decimal('17000.00'))

        # Health should be HEALTHY
        self.assertEqual(response.data['financial_health'], 'HEALTHY')
        self.assertEqual(response.data['budget_count'], 1)
        self.assertEqual(response.data['expense_count'], 1)
