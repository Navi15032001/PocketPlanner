from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from recurring.models import RecurringTransaction
from recurring.utils import process_due_recurring_transactions
from expenses.models import Expense
from income.models import Income
from notifications.models import Notification


class RecurringTransactionAutoProcessTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="recuruser",
            email="recur@example.com",
            password="testpassword123"
        )
        self.client.force_authenticate(user=self.user)

    def test_auto_process_due_expense_and_advance_date(self):
        today = timezone.localdate()

        # Create monthly recurring Netflix expense due today
        netflix = RecurringTransaction.objects.create(
            user=self.user,
            title="Netflix Subscription",
            amount=Decimal("499.00"),
            transaction_type="EXPENSE",
            frequency="MONTHLY",
            start_date=today - timedelta(days=30),
            next_due_date=today,
            is_active=True,
            reminder_enabled=True
        )

        # Run process
        count = process_due_recurring_transactions(self.user)
        self.assertEqual(count, 1)

        # Expense should be auto-created
        expense = Expense.objects.filter(user=self.user).first()
        self.assertIsNotNone(expense)
        self.assertEqual(expense.amount, Decimal("499.00"))
        self.assertIn("Netflix Subscription", expense.description)

        # Notification should be generated
        notif = Notification.objects.filter(user=self.user).first()
        self.assertIsNotNone(notif)
        self.assertIn("Netflix Subscription Auto-Processed", notif.title)

        # Next due date should be advanced by 1 month
        netflix.refresh_from_db()
        self.assertGreater(netflix.next_due_date, today)

    def test_auto_process_due_income(self):
        today = timezone.localdate()

        # Create monthly recurring Salary income due today
        RecurringTransaction.objects.create(
            user=self.user,
            title="Monthly Salary",
            amount=Decimal("50000.00"),
            transaction_type="INCOME",
            frequency="MONTHLY",
            start_date=today,
            next_due_date=today,
            is_active=True,
            reminder_enabled=True
        )

        # Calling dashboard endpoint should auto-trigger recurring processing
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Income should now exist
        income = Income.objects.filter(user=self.user).first()
        self.assertIsNotNone(income)
        self.assertEqual(income.amount, Decimal("50000.00"))
        self.assertEqual(income.title, "Monthly Salary")
