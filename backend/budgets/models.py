from django.db import models
from django.contrib.auth.models import User
from categories.models import Category


class Budget(models.Model):
    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    PERIOD_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='budgets'
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budgets'
    )

    name = models.CharField(max_length=100)

    target_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    allocated_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )

    period = models.CharField(
        max_length=10,
        choices=PERIOD_CHOICES,
        default='MONTHLY'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.period}) - {self.user.username}"


class BudgetDailyLog(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SPENT', 'Spent'),
        ('SKIPPED', 'Skipped'),
    ]

    budget = models.ForeignKey(
        Budget,
        on_delete=models.CASCADE,
        related_name='daily_logs'
    )

    date = models.DateField()

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    expense = models.ForeignKey(
        'expenses.Expense',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budget_logs'
    )

    note = models.CharField(
        max_length=200,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('budget', 'date')

    def __str__(self):
        return f"{self.budget.name} [{self.date}]: {self.status}"