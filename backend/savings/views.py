from django.db import transaction

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Saving
from .serializers import SavingSerializer


class SavingViewSet(viewsets.ModelViewSet):

    serializer_class = SavingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Saving.objects.filter(
            user=self.request.user
        ).order_by('-date', '-created_at')

    @transaction.atomic
    def perform_create(self, serializer):

        saving = serializer.save(
            user=self.request.user
        )

        goal = saving.goal

        goal.saved_amount += saving.amount

        if goal.saved_amount >= goal.target_amount:
            goal.saved_amount = goal.target_amount
            goal.status = 'COMPLETED'

        goal.save(
            update_fields=[
                'saved_amount',
                'status'
            ]
        )

    @transaction.atomic
    def perform_update(self, serializer):

        old_saving = self.get_object()

        old_amount = old_saving.amount
        old_goal = old_saving.goal

        saving = serializer.save()

        # Remove old amount from old goal
        old_goal.saved_amount -= old_amount

        if old_goal.saved_amount < 0:
            old_goal.saved_amount = 0

        old_goal.save(
            update_fields=['saved_amount']
        )

        # Add new amount to new goal
        new_goal = saving.goal

        new_goal.saved_amount += saving.amount

        if new_goal.saved_amount >= new_goal.target_amount:
            new_goal.saved_amount = new_goal.target_amount
            new_goal.status = 'COMPLETED'
        else:
            new_goal.status = 'ACTIVE'

        new_goal.save(
            update_fields=[
                'saved_amount',
                'status'
            ]
        )

    @transaction.atomic
    def perform_destroy(self, instance):

        goal = instance.goal
        amount = instance.amount

        instance.delete()

        goal.saved_amount -= amount

        if goal.saved_amount < 0:
            goal.saved_amount = 0

        if goal.saved_amount < goal.target_amount:
            goal.status = 'ACTIVE'

        goal.save(
            update_fields=[
                'saved_amount',
                'status'
            ]
        )