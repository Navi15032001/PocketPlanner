from django.urls import path

from .views import (
    MonthlyReportView,
    CategoryExpenseReportView,
    SavingsReportView,
    BudgetReportView,
)


urlpatterns = [

    path(
        'monthly/',
        MonthlyReportView.as_view(),
        name='monthly-report'
    ),

    path(
        'category-expenses/',
        CategoryExpenseReportView.as_view(),
        name='category-expenses'
    ),

    path(
        'savings/',
        SavingsReportView.as_view(),
        name='savings-report'
    ),

    path(
        'budgets/',
        BudgetReportView.as_view(),
        name='budget-report'
    ),
]