from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import UserProfile
from budgets.models import Budget


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
            priority="HIGH"
        )
        # Create Medium priority budget
        b2 = Budget.objects.create(
            user=self.user,
            name="Groceries",
            target_amount=Decimal("3000.00"),
            priority="MEDIUM"
        )
        # Create Low priority budget
        b3 = Budget.objects.create(
            user=self.user,
            name="Entertainment",
            target_amount=Decimal("3000.00"),
            priority="LOW"
        )

        # Allocate 10,000 balance across budgets
        response = self.client.post('/api/budgets/allocate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data['balance'])), Decimal('10000.00'))
        self.assertEqual(Decimal(str(response.data['allocated'])), Decimal('10000.00'))
        self.assertEqual(Decimal(str(response.data['available'])), Decimal('0.00'))

        # Check individual allocations by priority:
        # High: 6000 (fully funded)
        # Medium: 3000 (fully funded)
        # Low: 1000 (partially funded with remaining)
        b1.refresh_from_db()
        b2.refresh_from_db()
        b3.refresh_from_db()

        self.assertEqual(b1.allocated_amount, Decimal('6000.00'))
        self.assertEqual(b2.allocated_amount, Decimal('3000.00'))
        self.assertEqual(b3.allocated_amount, Decimal('1000.00'))
