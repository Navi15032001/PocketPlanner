from rest_framework import serializers

from .models import Income


class IncomeSerializer(serializers.ModelSerializer):
    income_type = serializers.CharField(max_length=50, required=False, default='OTHER', allow_blank=True)

    class Meta:
        model = Income

        fields = [
            'id',
            'title',
            'amount',
            'income_type',
            'date',
            'description',
            'created_at'
        ]

        read_only_fields = [
            'id',
            'created_at'
        ]