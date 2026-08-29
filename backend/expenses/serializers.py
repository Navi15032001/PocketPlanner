from rest_framework import serializers
from .models import Expense
from categories.models import Category


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source='category.name',
        read_only=True,
        default='Uncategorized'
    )

    class Meta:
        model = Expense
        fields = [
            'id',
            'category',
            'category_name',
            'amount',
            'description',
            'date',
            'created_at',
            'updated_at'
        ]

        read_only_fields = [
            'id',
            'created_at',
            'updated_at'
        ]

    def validate_category(self, category):
        if category is None:
            return category

        request = self.context.get('request')
        if request and category.user != request.user:
            raise serializers.ValidationError(
                "You cannot use another user's category."
            )

        return category