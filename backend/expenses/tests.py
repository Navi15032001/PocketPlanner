from decimal import Decimal
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import UserProfile
from categories.models import Category
from expenses.models import Expense


class ExpensesAPITestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testexpenseuser",
            email="expense@example.com",
            password="testpassword123"
        )
        self.other_user = User.objects.create_user(
            username="otheruser",
            email="other@example.com",
            password="testpassword123"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            opening_balance=Decimal("10000.00")
        )
        self.category = Category.objects.create(
            user=self.user,
            name="Groceries"
        )
        self.other_category = Category.objects.create(
            user=self.other_user,
            name="OtherGroceries"
        )

    def test_create_expense_with_category(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/expenses/', {
            'category': self.category.id,
            'amount': '250.00',
            'description': 'Vegetables',
            'date': '2026-08-16'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['category_name'], 'Groceries')

    def test_create_uncategorized_expense(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/expenses/', {
            'category': None,
            'amount': '150.00',
            'description': 'Miscellaneous',
            'date': '2026-08-16'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['category_name'], 'Uncategorized')

    def test_cannot_use_other_user_category(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/expenses/', {
            'category': self.other_category.id,
            'amount': '500.00',
            'description': 'Invalid test',
            'date': '2026-08-16'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
