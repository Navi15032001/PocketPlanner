from django.db import models
from django.contrib.auth.models import User


class Income(models.Model):

    INCOME_TYPE_CHOICES = [
        ('SALARY', 'Salary'),
        ('FREELANCE', 'Freelance'),
        ('BUSINESS', 'Business'),
        ('BONUS', 'Bonus'),
        ('OTHER', 'Other'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='incomes'
    )

    title = models.CharField(max_length=100)

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    income_type = models.CharField(
        max_length=20,
        choices=INCOME_TYPE_CHOICES,
        default='OTHER'
    )

    date = models.DateField()

    description = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.title} - {self.amount}"