from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

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