from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers

from .models import Goal


class GoalSerializer(serializers.ModelSerializer):

    remaining_amount = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Goal

        fields = [
            'id',
            'name',
            'target_amount',
            'saved_amount',
            'auto_split_percent',
            'remaining_amount',
            'progress_percentage',
            'deadline',
            'priority',
            'status',
            'description',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'saved_amount',
            'remaining_amount',
            'progress_percentage',
            'created_at',
        ]

    def get_remaining_amount(self, obj):
        remaining = obj.target_amount - obj.saved_amount

        if remaining < 0:
            return 0

        return remaining

    def get_progress_percentage(self, obj):

        if obj.target_amount <= 0:
            return 0

        progress = (
            obj.saved_amount / obj.target_amount
        ) * 100

        if progress > 100:
            progress = 100

        return round(progress, 2)

    def validate_auto_split_percent(self, value):

        if value < 0 or value > 100:
            raise serializers.ValidationError(
                "Auto-split must be between 0 and 100."
            )

        request = self.context['request']

        # Sum of auto_split_percent across this user's OTHER active goals
        other_goals_total = Goal.objects.filter(
            user=request.user,
            status='ACTIVE'
        ).exclude(
            pk=self.instance.pk if self.instance else None
        ).aggregate(
            total=Sum('auto_split_percent')
        )['total'] or Decimal('0.00')

        if other_goals_total + value > 100:
            available = Decimal('100.00') - other_goals_total
            raise serializers.ValidationError(
                f"Total auto-split across all goals can't exceed 100%. "
                f"You have {available}% available."
            )

        return value
