import csv
from io import BytesIO

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from expenses.models import Expense
from income.models import Income


class ExportExpensesCSVView(APIView):
    """GET /api/reports/export/expenses/csv/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="expenses.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Category', 'Amount', 'Description'])

        expenses = Expense.objects.filter(
            user=request.user
        ).select_related('category').order_by('-date')

        for e in expenses:
            writer.writerow([
                e.date,
                e.category.name if e.category else 'Uncategorized',
                e.amount,
                e.description,
            ])

        return response


class ExportIncomeCSVView(APIView):
    """GET /api/reports/export/income/csv/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="income.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Title', 'Type', 'Amount', 'Description'])

        incomes = Income.objects.filter(user=request.user).order_by('-date')

        for i in incomes:
            writer.writerow([
                i.date, i.title, i.income_type, i.amount, i.description
            ])

        return response


class ExportMonthlyReportPDFView(APIView):
    """
    GET /api/reports/export/monthly/pdf/
    Requires: pip install reportlab
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from django.db.models import Sum

        user = request.user

        total_expense = Expense.objects.filter(
            user=user
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_income = Income.objects.filter(
            user=user
        ).aggregate(total=Sum('amount'))['total'] or 0

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, height - 50, "PocketPlanner - Financial Report")

        p.setFont("Helvetica", 12)
        p.drawString(50, height - 90, f"User: {user.username}")
        p.drawString(50, height - 110, f"Total Income: {total_income}")
        p.drawString(50, height - 130, f"Total Expenses: {total_expense}")
        p.drawString(
            50, height - 150,
            f"Balance: {total_income - total_expense}"
        )

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="report.pdf"'
        return response
