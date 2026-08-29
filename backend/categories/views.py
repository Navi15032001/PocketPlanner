from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Category
from .serializers import CategorySerializer

DEFAULT_CATEGORIES = [
    "Food & Dining",
    "Groceries",
    "Transport & Fuel",
    "Shopping",
    "Utilities & Bills",
    "Entertainment",
    "Health & Medical",
    "Housing & Rent",
    "Personal & Misc"
]


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Category.objects.filter(user=self.request.user).order_by('name')
        if not qs.exists():
            Category.objects.bulk_create([
                Category(user=self.request.user, name=name) for name in DEFAULT_CATEGORIES
            ], ignore_conflicts=True)
            qs = Category.objects.filter(user=self.request.user).order_by('name')
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='seed')
    def seed_defaults(self, request):
        """
        Seeds standard fintech default categories for the requesting user.
        """
        created_count = 0
        for name in DEFAULT_CATEGORIES:
            _, created = Category.objects.get_or_create(user=request.user, name=name)
            if created:
                created_count += 1
        return Response({'detail': f'Seeded default categories. ({created_count} added)'})