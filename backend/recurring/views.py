from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import RecurringTransaction
from .serializers import RecurringTransactionSerializer
from .utils import process_due_recurring_transactions


class RecurringTransactionViewSet(viewsets.ModelViewSet):

    serializer_class = RecurringTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RecurringTransaction.objects.filter(
            user=self.request.user
        ).order_by('next_due_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def process_due(self, request):
        """
        Processes any due recurring bills/incomes for the authenticated user.
        """
        count = process_due_recurring_transactions(request.user)
        return Response(
            {'processed': count},
            status=status.HTTP_200_OK
        )
