from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Goal
from .serializers import GoalSerializer
from savings.models import Saving
from income.models import Income


class GoalViewSet(viewsets.ModelViewSet):

    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(
            user=self.request.user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        goal = serializer.save(user=self.request.user)
        self._apply_auto_split_from_existing_incomes(goal)

    def perform_update(self, serializer):
        goal = serializer.save()
        if goal.auto_split_percent > 0:
            self._apply_auto_split_from_existing_incomes(goal)

    def _apply_auto_split_from_existing_incomes(self, goal):
        """
        Whenever a goal is created or updated with auto_split_percent > 0,
        automatically scan existing income entries logged by the user and
        allocate the split amount if not already split.
        """
        if goal.auto_split_percent <= 0 or goal.status == 'COMPLETED':
            return

        user = goal.user
        existing_incomes = Income.objects.filter(user=user).order_by('date', 'id')

        with transaction.atomic():
            for inc in existing_incomes:
                already_split = Saving.objects.filter(
                    user=user,
                    goal=goal,
                    date=inc.date,
                    description__icontains=f"from income: {inc.title}"
                ).exists()

                if not already_split:
                    split_amt = (
                        inc.amount * goal.auto_split_percent / Decimal('100')
                    ).quantize(Decimal('0.01'))

                    if split_amt > 0:
                        Saving.objects.create(
                            user=user,
                            goal=goal,
                            amount=split_amt,
                            date=inc.date,
                            description=f"Auto-split ({goal.auto_split_percent}%) from income: {inc.title}"
                        )
                        goal.saved_amount += split_amt

                        if goal.saved_amount >= goal.target_amount:
                            goal.saved_amount = goal.target_amount
                            goal.status = 'COMPLETED'
                            break

            goal.save(update_fields=['saved_amount', 'status'])

    @action(detail=True, methods=['post'], url_path='reset')
    def reset_progress(self, request, pk=None):
        """
        Resets a goal's saved_amount back to ₹0 and clears associated saving history.
        """
        goal = self.get_object()
        with transaction.atomic():
            Saving.objects.filter(user=request.user, goal=goal).delete()
            goal.saved_amount = Decimal('0.00')
            goal.status = 'ACTIVE'
            goal.save(update_fields=['saved_amount', 'status'])

        return Response(
            {'detail': f"Goal '{goal.name}' has been reset to ₹0."},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='sync-splits')
    def sync_all_splits(self, request):
        """
        Scans all active goals with auto_split_percent > 0 and applies
        any missing splits from existing incomes.
        """
        goals = Goal.objects.filter(user=request.user, status='ACTIVE', auto_split_percent__gt=0)
        for g in goals:
            self._apply_auto_split_from_existing_incomes(g)
        return Response({'detail': 'Goal income splits synchronized successfully.'}, status=status.HTTP_200_OK)