from django.db import models
from django.contrib.auth.models import User
from goals.models import Goal


class Saving(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='savings'
    )

    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name='savings'
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
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
        return f"{self.amount} - {self.goal.name}"