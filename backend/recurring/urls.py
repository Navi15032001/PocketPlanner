from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import RecurringTransactionViewSet

router = DefaultRouter()

router.register(
    '',
    RecurringTransactionViewSet,
    basename='recurring'
)

urlpatterns = [
    path('', include(router.urls)),
]
