from django.urls import path

from .views import (
    SpendingPatternView,
    ExpenseForecastView,
    FinancialHealthScoreView,
    SmartSuggestionsView,
    MonthlySummaryView,
)

urlpatterns = [
    path('spending-pattern/', SpendingPatternView.as_view(), name='spending-pattern'),
    path('forecast/', ExpenseForecastView.as_view(), name='expense-forecast'),
    path('health-score/', FinancialHealthScoreView.as_view(), name='health-score'),
    path('suggestions/', SmartSuggestionsView.as_view(), name='suggestions'),
    path('monthly-summary/', MonthlySummaryView.as_view(), name='monthly-summary'),
]
