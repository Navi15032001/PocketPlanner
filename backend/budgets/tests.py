from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import UserProfile
from budgets.models import Budget, BudgetDailyLog
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
        budget = Budget.objects.create(
            user=self.user,
            name="Daily Chai & Snacks",
            target_amount=Decimal("100.00"),
            allocated_amount=Decimal("100.00"),
            priority="HIGH",
            period="DAILY"
        )

        response = self.client.post(f'/api/budgets/{budget.id}/spend/', {
            'amount': '40.00',
            'description': 'Morning Masala Chai'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['amount_spent'])), Decimal('40.00'))
        self.assertEqual(Decimal(str(response.data['remaining_allocated'])), Decimal('60.00'))

        expense = Expense.objects.filter(user=self.user, description='Morning Masala Chai').first()
        self.assertIsNotNone(expense)
        self.assertEqual(expense.amount, Decimal('40.00'))

        budget.refresh_from_db()
        self.assertEqual(budget.allocated_amount, Decimal('60.00'))

    def test_budget_matrix_and_cell_toggle(self):
        daily_b = Budget.objects.create(
            user=self.user,
            name="Metro Travel",
            target_amount=Decimal("80.00"),
            allocated_amount=Decimal("80.00"),
            priority="HIGH",
            period="DAILY"
        )
        monthly_b = Budget.objects.create(
            user=self.user,
            name="House Rent",
            target_amount=Decimal("12000.00"),
            allocated_amount=Decimal("12000.00"),
            priority="HIGH",
            period="MONTHLY"
        )

        # 1. Fetch matrix for August 2026
        response = self.client.get('/api/budgets/matrix/?year=2026&month=8')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_days'], 31)
        self.assertEqual(len(response.data['matrix']), 2)

        # 2. Toggle Day 15 to SPENT
        toggle_res = self.client.post(f'/api/budgets/{daily_b.id}/cell-toggle/', {
            'date': '2026-08-15',
            'status': 'SPENT',
            'amount': '80.00'
        })
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertEqual(toggle_res.data['status'], 'SPENT')

        # Verify expense created
        exp = Expense.objects.filter(user=self.user, date='2026-08-15').first()
        self.assertIsNotNone(exp)
        self.assertEqual(exp.amount, Decimal('80.00'))

        # 3. Toggle Day 16 (Sunday) to SKIPPED
        skip_res = self.client.post(f'/api/budgets/{daily_b.id}/cell-toggle/', {
            'date': '2026-08-16',
            'status': 'SKIPPED'
        })
        self.assertEqual(skip_res.status_code, status.HTTP_200_OK)
        self.assertEqual(skip_res.data['status'], 'SKIPPED')

        # Re-fetch matrix and verify counts
        matrix_res = self.client.get('/api/budgets/matrix/?year=2026&month=8')
        daily_row = next(r for r in matrix_res.data['matrix'] if r['id'] == daily_b.id)
        self.assertEqual(daily_row['spent_days_count'], 1)
        self.assertEqual(daily_row['skipped_days_count'], 1)
        self.assertEqual(daily_row['cells']['15']['status'], 'SPENT')
        self.assertEqual(daily_row['cells']['16']['status'], 'SKIPPED')
