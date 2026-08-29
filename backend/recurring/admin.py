from django.contrib import admin
from .models import RecurringTransaction


@admin.register(RecurringTransaction)
class RecurringTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'user', 'transaction_type', 'amount',
        'frequency', 'next_due_date', 'is_active'
    )
    list_filter = ('transaction_type', 'frequency', 'is_active')
    search_fields = ('title', 'user__username')
