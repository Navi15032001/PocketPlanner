from decimal import Decimal
from django.contrib.auth.models import User
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import UserProfile
from accounts.utils import get_current_balance


class AccountsAndCoreLogicTestCase(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword123"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            opening_balance=Decimal("5000.00"),
            currency="INR"
        )

    def test_login_and_token_generation(self):
        response = self.client.post('/api/accounts/login/', {
            'username': 'testuser',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_profile_retrieval_and_update(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(Decimal(str(response.data['opening_balance'])), Decimal('5000.00'))

        patch_response = self.client.patch('/api/accounts/profile/', {
            'currency': 'USD'
        })
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data['currency'], 'USD')

    def test_get_current_balance(self):
        balance = get_current_balance(self.user)
        self.assertEqual(balance, Decimal('5000.00'))

    def test_password_reset_flow(self):
        # 1. Request password reset
        reset_req = self.client.post('/api/accounts/password-reset/', {
            'email': 'test@example.com'
        })
        self.assertEqual(reset_req.status_code, status.HTTP_200_OK)
        
        # Security Verification: token & reset_link must NEVER be in HTTP response
        self.assertNotIn('token', reset_req.data)
        self.assertNotIn('reset_link', reset_req.data)
        self.assertNotIn('uid', reset_req.data)

        # Email Verification: Email must be sent to user's inbox
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, ['test@example.com'])
        self.assertIn('PocketPlanner - Password Reset Link', sent_email.subject)
        self.assertIn('reset-password.html?uid=', sent_email.body)

        # Extract tokens generated for user
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        # 2. Confirm password reset
        confirm_req = self.client.post('/api/accounts/password-reset-confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword123!'
        })
        self.assertEqual(confirm_req.status_code, status.HTTP_200_OK)

        # 3. Old password should now fail
        old_login = self.client.post('/api/accounts/login/', {
            'username': 'testuser',
            'password': 'testpassword123'
        })
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # 4. New password should successfully log in
        new_login = self.client.post('/api/accounts/login/', {
            'username': 'testuser',
            'password': 'BrandNewPassword123!'
        })
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)
        self.assertIn('access', new_login.data)
