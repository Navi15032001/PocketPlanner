from django.contrib import admin
from django.urls import path, include
from reports.export_views import (
    ExportExpensesCSVView,
    ExportIncomeCSVView,
    ExportMonthlyReportPDFView,
)

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "ok",
        "version": "v18.1",
        "custom_income_support": True
    })

urlpatterns = [
    path('api/health/', health_check),
    path('api/version/', health_check),
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/categories/', include('categories.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/budgets/', include('budgets.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/income/', include('income.urls')),
    path('api/goals/', include('goals.urls')),
    path('api/savings/', include('savings.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/recurring/', include('recurring.urls')),
    path('api/reports/export/expenses/csv/', ExportExpensesCSVView.as_view()),
    path('api/reports/export/income/csv/', ExportIncomeCSVView.as_view()),
    path('api/reports/export/monthly/pdf/', ExportMonthlyReportPDFView.as_view()),
    path('api/smartfinance/', include('smartfinance.urls')),
]