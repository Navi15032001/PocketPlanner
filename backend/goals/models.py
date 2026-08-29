from django.db import models
from django.contrib.auth.models import User


class Goal(models.Model):

    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='goals'
    )

    name = models.CharField(max_length=150)

    target_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    saved_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    # What % of every NEW income entry should automatically be saved
    # toward this goal. E.g. 20 means "put 20% of every income I log
    # into this goal automatically". Sum across a user's active goals
    # is capped at 100 (validated in the serializer).
    auto_split_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )

    deadline = models.DateField(
        null=True,
        blank=True
    )

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )

    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name
