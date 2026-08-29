from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    CURRENCY_CHOICES = [
        ('INR', 'Indian Rupee (₹)'),
        ('USD', 'US Dollar ($)'),
        ('EUR', 'Euro (€)'),
    ]

    LANGUAGE_CHOICES = [
        ('EN', 'English'),
        ('HI', 'Hindi'),
    ]

    THEME_CHOICES = [
        ('LIGHT', 'Light'),
        ('DARK', 'Dark'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)

    # Starting point for the balance-based model:
    # Current Balance = opening_balance + total income - total expenses
    # This is a one-time "how much money did you have when you started
    # using PocketPlanner" value, NOT a recurring monthly figure.
    opening_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='INR'
    )

    language = models.CharField(
        max_length=2,
        choices=LANGUAGE_CHOICES,
        default='EN'
    )

    theme = models.CharField(
        max_length=5,
        choices=THEME_CHOICES,
        default='LIGHT'
    )

    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username
