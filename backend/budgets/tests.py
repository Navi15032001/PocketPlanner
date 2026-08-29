from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import UserProfile
from budgets.models import Budget
from expenses.models import Expense


class BudgetLogicTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="budgetuser",
            email="budget@example.com",
            password="testpassword123"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            opening_balance=Decimal("10000.00"),
            currency="INR"
        )
        self.client.force_authenticate(user=self.user)

    def test_budget_creation_and_priority_allocation(self):
        # Create High priority budget
        b1 = Budget.objects.create(
            user=self.user,
            name="Rent",
            target_amount=Decimal("6000.00"),
            priority="HIGH",
            period="MONTHLY"
        )
        # Create Medium priority budget
        b2 = Budget.objects.create(
            user=self.user,
            name="Groceries",
            target_amount=Decimal("3000.00"),
            priority="MEDIUM",
            period="MONTHLY"
        )
        # Create Low priority budget
        b3 = Budget.objects.create(
            user=self.user,
            name="Daily Chai",
            target_amount=Decimal("100.00"),
            priority="LOW",
            period="DAILY"
        )

        # Allocate 10,000 balance across budgets
        response = self.client.post('/api/budgets/allocate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['balance'])), Decimal('10000.00'))
        self.assertEqual(Decimal(str(response.data['allocated'])), Decimal('9100.00'))
        self.assertEqual(Decimal(str(response.data['available'])), Decimal('900.00'))

        b1.refresh_from_db()
        b2.refresh_from_db()
        b3.refresh_from_db()

        self.assertEqual(b1.allocated_amount, Decimal('6000.00'))
        self.assertEqual(b2.allocated_amount, Decimal('3000.00'))
        self.assertEqual(b3.allocated_amount, Decimal('100.00'))

    def test_1_tap_spend_from_budget_drawdown(self):
        # Create a Daily Chai Budget with allocated ₹100
        budget = Budget.objects.create(
            user=self.user,
            name="Daily Chai & Snacks",
            target_amount=Decimal("100.00"),
            allocated_amount=Decimal("100.00"),
            priority="HIGH",
            period="DAILY"
        )

        # Spend ₹40 from budget
        response = self.client.post(f'/api/budgets/{budget.id}/spend/', {
            'amount': '40.00',
            'description': 'Morning Masala Chai'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['amount_spent'])), Decimal('40.00'))
        self.assertEqual(Decimal(str(response.data['remaining_allocated'])), Decimal('60.00'))

        # Verify expense was created
        expense = Expense.objects.filter(user=self.user, description='Morning Masala Chai').first()
        self.assertIsNotNone(expense)
        self.assertEqual(expense.amount, Decimal('40.00'))

        # Verify budget was deducted
        budget.refresh_from_db()
        self.assertEqual(budget.allocated_amount, Decimal('60.00'))
