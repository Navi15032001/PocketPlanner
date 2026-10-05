from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import UserProfile
from goals.models import Goal
from savings.models import Saving


class IncomeAndGoalSplitTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="incomeuser",
            email="income@example.com",
            password="testpassword123"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            opening_balance=Decimal("0.00")
        )
        self.goal = Goal.objects.create(
            user=self.user,
            name="New Laptop",
            target_amount=Decimal("50000.00"),
            saved_amount=Decimal("0.00"),
            auto_split_percent=Decimal("20.00"),
            status="ACTIVE"
        )

    def test_income_auto_splits_into_goal(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/income/', {
            'title': 'Salary',
            'income_type': 'SALARY',
            'amount': '10000.00',
            'date': '2026-08-16',
            'description': 'Monthly paycheck'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.goal.refresh_from_db()
        # 20% of 10,000 = 2,000
        self.assertEqual(self.goal.saved_amount, Decimal('2000.00'))

        savings = Saving.objects.filter(user=self.user, goal=self.goal)
        self.assertEqual(savings.count(), 1)
        self.assertEqual(savings.first().amount, Decimal('2000.00'))

    def test_income_delete_cleans_up_goal_splits(self):
        self.client.force_authenticate(user=self.user)
        # Create income
        response = self.client.post('/api/income/', {
            'title': 'Salary Bonus',
            'income_type': 'BONUS',
            'amount': '10000.00',
            'date': '2026-08-16',
            'description': 'Bonus paycheck'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        income_id = response.data['id']

        self.goal.refresh_from_db()
        self.assertEqual(self.goal.saved_amount, Decimal('2000.00'))
        self.assertEqual(Saving.objects.filter(user=self.user, goal=self.goal).count(), 1)

        # Delete income via API
        del_response = self.client.delete(f'/api/income/{income_id}/')
        self.assertEqual(del_response.status_code, status.HTTP_204_NO_CONTENT)

        # Check split savings deleted and goal saved_amount deducted
        self.goal.refresh_from_db()
        self.assertEqual(self.goal.saved_amount, Decimal('0.00'))
        self.assertEqual(self.goal.status, 'ACTIVE')
        self.assertEqual(Saving.objects.filter(user=self.user, goal=self.goal).count(), 0)
