from rest_framework import serializers
from .models import Budget, BudgetDailyLog


class BudgetDailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetDailyLog
        fields = [
            'id',
            'budget',
            'date',
            'status',
            'amount',
            'expense',
            'note',
            'created_at',
            'updated_at'
        ]


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'target_amount',
            'allocated_amount',
            'priority',
            'period',
            'created_at',
            'updated_at'
        ]

        read_only_fields = [
            'id',
            'allocated_amount',
            'created_at',
            'updated_at'
        ]