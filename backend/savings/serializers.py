from rest_framework import serializers
from .models import Saving


class SavingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Saving

        fields = [
            'id',
            'goal',
            'amount',
            'date',
            'description',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
        ]

    def validate_goal(self, goal):

        request = self.context['request']

        if goal.user != request.user:
            raise serializers.ValidationError(
                "You cannot save money for another user's goal."
            )

        return goal

    def validate_amount(self, amount):

        if amount <= 0:
            raise serializers.ValidationError(
                "Saving amount must be greater than zero."
            )

        return amount