from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from goals.models import Goal
from savings.models import Saving


class GoalsAndSavingsTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="goaluser",
            email="goal@example.com",
            password="testpassword123"
        )
        self.client.force_authenticate(user=self.user)

    def test_goal_creation_and_manual_saving(self):
        # Create Goal
        goal = Goal.objects.create(
            user=self.user,
            name="Emergency Fund",
            target_amount=Decimal("5000.00"),
            auto_split_percent=Decimal("0.00")
        )

        # Deposit saving
        res = self.client.post('/api/savings/', {
            'goal': goal.id,
            'amount': '2000.00',
            'date': '2026-08-17',
            'description': 'Direct bank deposit'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        goal.refresh_from_db()
        self.assertEqual(goal.saved_amount, Decimal('2000.00'))
        self.assertEqual(goal.status, 'ACTIVE')

        # Deposit remaining 3000 -> should mark COMPLETED
        res2 = self.client.post('/api/savings/', {
            'goal': goal.id,
            'amount': '3000.00',
            'date': '2026-08-17',
            'description': 'Final deposit'
        })
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        goal.refresh_from_db()
        self.assertEqual(goal.saved_amount, Decimal('5000.00'))
        self.assertEqual(goal.status, 'COMPLETED')

    def test_auto_split_validation_max_100_percent(self):
        # Goal 1: 70%
        Goal.objects.create(
            user=self.user,
            name="Goal A",
            target_amount=Decimal("1000.00"),
            auto_split_percent=Decimal("70.00"),
            status='ACTIVE'
        )

        # Goal 2: 40% -> total 110% -> should fail validation
        res = self.client.post('/api/goals/', {
            'name': 'Goal B',
            'target_amount': '1000.00',
            'auto_split_percent': '40.00',
            'priority': 'MEDIUM'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('auto_split_percent', res.data)
