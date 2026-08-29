from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):

    TYPE_CHOICES = [
        ('BUDGET_ALERT', 'Budget Alert'),
        ('GOAL_PROGRESS', 'Goal Progress'),
        ('MONTHLY_REPORT', 'Monthly Report Ready'),
        ('EXPENSE_REMINDER', 'Expense Reminder'),
        ('LARGE_EXPENSE', 'Large Expense Alert'),
        ('RECURRING_DUE', 'Recurring Transaction Due'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )

    title = models.CharField(max_length=150)

    message = models.TextField()

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"
