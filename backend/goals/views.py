from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Goal
from .serializers import GoalSerializer
from savings.models import Saving


class GoalViewSet(viewsets.ModelViewSet):

    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Goal.objects.filter(
            user=self.request.user
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )

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