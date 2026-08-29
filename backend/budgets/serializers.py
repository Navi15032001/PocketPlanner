from rest_framework import serializers
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):

    class Meta:
        model = Budget
        fields = [
            'id',
            'name',
            'target_amount',
            'allocated_amount',
            'priority',
            'created_at',
            'updated_at'
        ]

        read_only_fields = [
            'id',
            'allocated_amount',
            'created_at',
            'updated_at'
        ]