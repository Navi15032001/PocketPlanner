from decimal import Decimal

from django.db import transaction
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Income


@receiver(post_save, sender=Income)
def auto_split_income_into_goals(sender, instance, created, **kwargs):
    """
    Whenever a new Income entry is created (manually OR via CSV import),
    automatically log a Saving entry toward every goal that has an
    auto_split_percent > 0, and bump that goal's saved_amount - exactly
    like adding the saving by hand would, just automatic.
    """

    if not created:
        return

    from goals.models import Goal
    from savings.models import Saving

    goals = Goal.objects.filter(
        user=instance.user,
        status='ACTIVE',
        auto_split_percent__gt=0
    )

    if not goals.exists():
        return

    with transaction.atomic():
        for goal in goals:

            split_amount = (
                instance.amount * goal.auto_split_percent / Decimal('100')
            ).quantize(Decimal('0.01'))

            if split_amount <= 0:
                continue

            Saving.objects.create(
                user=instance.user,
                goal=goal,
                income=instance,
                amount=split_amount,
                date=instance.date,
                description=f"Auto-split ({goal.auto_split_percent}%) from income: {instance.title}"
            )

            goal.saved_amount += split_amount

            if goal.saved_amount >= goal.target_amount:
                goal.saved_amount = goal.target_amount
                goal.status = 'COMPLETED'

            goal.save(update_fields=['saved_amount', 'status'])


@receiver(pre_delete, sender=Income)
def cleanup_split_savings_on_income_delete(sender, instance, **kwargs):
    """
    Whenever an Income entry is deleted, automatically delete all split savings
    associated with it (both via foreign key and legacy description matching),
    and deduct the saved amounts from the respective goals, restoring goal
    status back to ACTIVE if no longer completed.
    """
    from savings.models import Saving

    # 1. Savings linked directly via foreign key
    fk_savings = list(instance.split_savings.select_related('goal').all()) if hasattr(instance, 'split_savings') else []

    # 2. Legacy savings linked by matching description, date, and user
    legacy_savings = list(Saving.objects.filter(
        user=instance.user,
        date=instance.date,
        description__icontains=f"from income: {instance.title}"
    ).select_related('goal'))

    all_savings = {s.id: s for s in (fk_savings + legacy_savings)}.values()

    with transaction.atomic():
        for saving in all_savings:
            goal = saving.goal
            if goal:
                goal.saved_amount = max(Decimal('0.00'), goal.saved_amount - saving.amount)
                if goal.saved_amount < goal.target_amount:
                    goal.status = 'ACTIVE'
                goal.save(update_fields=['saved_amount', 'status'])
            saving.delete()
