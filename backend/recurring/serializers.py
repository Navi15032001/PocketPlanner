from rest_framework import serializers
from .models import RecurringTransaction


class RecurringTransactionSerializer(serializers.ModelSerializer):

    class Meta:
        model = RecurringTransaction

        fields = [
            'id',
            'transaction_type',
            'title',
            'category',
            'amount',
            'frequency',
            'start_date',
            'next_due_date',
            'reminder_enabled',
            'is_active',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
        ]

    def validate_amount(self, amount):
        if amount <= 0:
            raise serializers.ValidationError(
                "Amount must be greater than zero."
            )
        return amount

    def validate_category(self, category):
        if category is None:
            return category

        request = self.context['request']

        if category.user != request.user:
            raise serializers.ValidationError(
                "You cannot use another user's category."
            )

        return category
