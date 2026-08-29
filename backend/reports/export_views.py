import csv
from datetime import datetime
from io import BytesIO

from django.http import HttpResponse
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from expenses.models import Expense
from income.models import Income
from budgets.models import Budget
from goals.models import Goal
from accounts.models import UserProfile

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    and professional footer on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        # Top footer border line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(36, 36, 559, 36)

        # Left disclaimer & Right page numbering
        self.drawString(36, 24, "PocketPlanner Personal Finance — Generated Securely & Confidentially")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(559, 24, page_text)
        self.restoreState()


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
    Generates a world-class, executive-ready Monthly Financial Health
    & Cash Flow Statement PDF for the authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = datetime.now()
        current_month_str = now.strftime("%B %Y")
        current_date_str = now.strftime("%d %b %Y, %I:%M %p")

        # -------------------------------------------------------------
        # 1. CORE FINANCIAL DATA COMPUTATIONS
        # -------------------------------------------------------------
        try:
            profile = UserProfile.objects.filter(user=user).first()
            opening_balance = float(profile.opening_balance) if profile else 0.0
        except Exception:
            opening_balance = 0.0

        total_income = float(
            Income.objects.filter(user=user).aggregate(total=Sum('amount'))['total'] or 0.0
        )
        total_expense = float(
            Expense.objects.filter(user=user).aggregate(total=Sum('amount'))['total'] or 0.0
        )

        current_month_expenses = float(
            Expense.objects.filter(
                user=user,
                date__year=now.year,
                date__month=now.month
            ).aggregate(total=Sum('amount'))['total'] or 0.0
        )

        current_balance = opening_balance + total_income - total_expense

        total_budgets = float(
            Budget.objects.filter(user=user).aggregate(total=Sum('target_amount'))['total'] or 0.0
        )
        total_goal_savings = float(
            Goal.objects.filter(user=user).aggregate(total=Sum('saved_amount'))['total'] or 0.0
        )

        total_reserved = total_budgets + total_goal_savings
        available_cash = max(0.0, current_balance - total_reserved)

        # Health Ratio
        health_status = "HEALTHY (Optimal Liquidity)"
        health_color = "#059669"
        if available_cash <= 0 and current_balance > 0:
            health_status = "MODERATE (High Allocation)"
            health_color = "#D97706"
        elif current_balance <= 0:
            health_status = "CRITICAL (Zero Free Liquidity)"
            health_color = "#DC2626"

        # -------------------------------------------------------------
        # 2. REPORTLAB DOCUMENT SETUP
        # -------------------------------------------------------------
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=50
        )

        styles = getSampleStyleSheet()

        # Custom Typography Styles
        brand_title_style = ParagraphStyle(
            'BrandTitle',
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#4F46E5')
        )

        brand_subtitle_style = ParagraphStyle(
            'BrandSubtitle',
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#64748B')
        )

        header_meta_right = ParagraphStyle(
            'HeaderMetaRight',
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            alignment=2,
            textColor=colors.HexColor('#475569')
        )

        section_heading_style = ParagraphStyle(
            'SectionHeading',
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=4
        )

        table_header_style = ParagraphStyle(
            'TableHeader',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#FFFFFF')
        )

        table_cell_style = ParagraphStyle(
            'TableCell',
            fontName='Helvetica',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B')
        )

        table_cell_bold = ParagraphStyle(
            'TableCellBold',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B')
        )

        table_cell_green = ParagraphStyle(
            'TableCellGreen',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#059669')
        )

        table_cell_red = ParagraphStyle(
            'TableCellRed',
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#DC2626')
        )

        table_cell_muted = ParagraphStyle(
            'TableCellMuted',
            fontName='Helvetica',
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor('#64748B')
        )

        story = []

        # -------------------------------------------------------------
        # 3. HEADER & BRANDING BANNER
        # -------------------------------------------------------------
        header_table_data = [
            [
                Paragraph("<b>Pocket<font color='#10B981'>Planner</font></b>", brand_title_style),
                Paragraph(
                    f"<b>Statement Period:</b> {current_month_str}<br/>"
                    f"<b>Generated on:</b> {current_date_str}<br/>"
                    f"<b>Report ID:</b> #PP-{now.strftime('%Y%m')}-{user.id}",
                    header_meta_right
                )
            ],
            [
                Paragraph("Executive Monthly Financial Health & Cash Flow Statement", brand_subtitle_style),
                Paragraph(f"<b>Account Holder:</b> {user.username} ({user.email or 'Personal User'})", header_meta_right)
            ]
        ]

        header_table = Table(header_table_data, colWidths=[280, 243])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4F46E5"), spaceAfter=10))

        # -------------------------------------------------------------
        # 4. EXECUTIVE KPI CARDS GRID (4-COLUMN FINANCIAL SUMMARY)
        # -------------------------------------------------------------
        kpi_data = [
            [
                Paragraph("<b>AVAILABLE FREE CASH</b>", table_cell_muted),
                Paragraph("<b>CURRENT BALANCE</b>", table_cell_muted),
                Paragraph("<b>MONTH EXPENSES</b>", table_cell_muted),
                Paragraph("<b>TOTAL RESERVED</b>", table_cell_muted)
            ],
            [
                Paragraph(f"<b>Rs. {available_cash:,.2f}</b>", ParagraphStyle('KPI1', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#059669'))),
                Paragraph(f"<b>Rs. {current_balance:,.2f}</b>", ParagraphStyle('KPI2', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#2563EB'))),
                Paragraph(f"<b>Rs. {current_month_expenses:,.2f}</b>", ParagraphStyle('KPI3', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#DC2626'))),
                Paragraph(f"<b>Rs. {total_reserved:,.2f}</b>", ParagraphStyle('KPI4', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=colors.HexColor('#D97706')))
            ],
            [
                Paragraph("Free unreserved cash", table_cell_muted),
                Paragraph("Opening + Inflow - Outflow", table_cell_muted),
                Paragraph(f"Total spent in {now.strftime('%b')}", table_cell_muted),
                Paragraph("Budgets + Goal Savings", table_cell_muted)
            ]
        ]

        kpi_table = Table(kpi_data, colWidths=[130, 130, 130, 133])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))

        # Status Strip
        status_data = [[
            Paragraph(f"<b>Financial Health Status:</b> <font color='{health_color}'>{health_status}</font>", table_cell_bold),
            Paragraph(f"<b>Total Inflow:</b> Rs. {total_income:,.2f}  |  <b>Total Outflow:</b> Rs. {total_expense:,.2f}", header_meta_right)
        ]]
        status_table = Table(status_data, colWidths=[280, 243])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # 5. EXPENSE BREAKDOWN BY CATEGORY
        # -------------------------------------------------------------
        story.append(Paragraph("<b>SPENDING BREAKDOWN BY CATEGORY</b>", section_heading_style))

        cat_qs = Expense.objects.filter(user=user).values('category__name').annotate(
            total=Sum('amount')
        ).order_by('-total')

        cat_rows = [[
            Paragraph("Category", table_header_style),
            Paragraph("Amount Spent", table_header_style),
            Paragraph("Share of Outflow", table_header_style),
            Paragraph("Allocation Status", table_header_style)
        ]]

        if cat_qs.exists():
            for c in cat_qs:
                cat_name = c['category__name'] or "Uncategorized"
                cat_amt = float(c['total'] or 0.0)
                share = (cat_amt / total_expense * 100.0) if total_expense > 0 else 0.0
                cat_rows.append([
                    Paragraph(f"<b>{cat_name}</b>", table_cell_style),
                    Paragraph(f"Rs. {cat_amt:,.2f}", table_cell_bold),
                    Paragraph(f"{share:.1f}%", table_cell_style),
                    Paragraph("Standard" if share < 40 else "High Outflow", table_cell_muted)
                ])
        else:
            cat_rows.append([
                Paragraph("No expenses recorded yet.", table_cell_muted),
                Paragraph("Rs. 0.00", table_cell_muted),
                Paragraph("0.0%", table_cell_muted),
                Paragraph("—", table_cell_muted)
            ])

        cat_table = Table(cat_rows, colWidths=[180, 110, 110, 123])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # 6. ACTIVE ENVELOPES & GOALS PROGRESS
        # -------------------------------------------------------------
        story.append(Paragraph("<b>ACTIVE BUDGETS & SAVINGS GOALS</b>", section_heading_style))

        budgets_qs = Budget.objects.filter(user=user).order_by('-target_amount')[:4]
        goals_qs = Goal.objects.filter(user=user).order_by('-target_amount')[:4]

        plan_rows = [[
            Paragraph("Item Name & Type", table_header_style),
            Paragraph("Target Cap / Goal", table_header_style),
            Paragraph("Funded / Saved", table_header_style),
            Paragraph("Progress / Priority", table_header_style)
        ]]

        if budgets_qs.exists() or goals_qs.exists():
            for b in budgets_qs:
                plan_rows.append([
                    Paragraph(f"<b>{b.name}</b> <font color='#64748B'>({b.period or 'Budget'})</font>", table_cell_style),
                    Paragraph(f"Rs. {float(b.target_amount):,.2f}", table_cell_style),
                    Paragraph(f"Rs. {float(b.allocated_amount or 0):,.2f}", table_cell_bold),
                    Paragraph(f"{b.priority or 'Medium'}", table_cell_muted)
                ])
            for g in goals_qs:
                pct = (float(g.saved_amount) / float(g.target_amount) * 100.0) if float(g.target_amount) > 0 else 0.0
                plan_rows.append([
                    Paragraph(f"<b>{g.name}</b> <font color='#64748B'>(Goal)</font>", table_cell_style),
                    Paragraph(f"Rs. {float(g.target_amount):,.2f}", table_cell_style),
                    Paragraph(f"Rs. {float(g.saved_amount):,.2f}", table_cell_green),
                    Paragraph(f"{pct:.1f}% Complete", table_cell_bold)
                ])
        else:
            plan_rows.append([
                Paragraph("No active budgets or goals configured.", table_cell_muted),
                Paragraph("—", table_cell_muted),
                Paragraph("—", table_cell_muted),
                Paragraph("—", table_cell_muted)
            ])

        plan_table = Table(plan_rows, colWidths=[180, 110, 110, 123])
        plan_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(plan_table)
        story.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # 7. RECENT ITEMIZED TRANSACTIONS LOG
        # -------------------------------------------------------------
        story.append(Paragraph("<b>RECENT TRANSACTION LEDGER (Latest 8 Outflows)</b>", section_heading_style))

        recent_expenses = Expense.objects.filter(user=user).select_related('category').order_by('-date', '-id')[:8]

        tx_rows = [[
            Paragraph("Date", table_header_style),
            Paragraph("Description / Note", table_header_style),
            Paragraph("Category", table_header_style),
            Paragraph("Outflow Amount", table_header_style)
        ]]

        if recent_expenses.exists():
            for exp in recent_expenses:
                tx_rows.append([
                    Paragraph(str(exp.date), table_cell_muted),
                    Paragraph(f"<b>{exp.description or 'Expense'}</b>", table_cell_style),
                    Paragraph(f"{exp.category.name if exp.category else 'Uncategorized'}", table_cell_muted),
                    Paragraph(f"-Rs. {float(exp.amount):,.2f}", table_cell_red)
                ])
        else:
            tx_rows.append([
                Paragraph("—", table_cell_muted),
                Paragraph("No recent transactions found.", table_cell_muted),
                Paragraph("—", table_cell_muted),
                Paragraph("Rs. 0.00", table_cell_muted)
            ])

        tx_table = Table(tx_rows, colWidths=[90, 200, 110, 123])
        tx_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(tx_table)

        # -------------------------------------------------------------
        # 8. BUILD DOCUMENT WITH TWO-PASS NUMBERED CANVAS
        # -------------------------------------------------------------
        doc.build(story, canvasmaker=NumberedCanvas)

        buffer.seek(0)
        filename = f"PocketPlanner_Statement_{now.strftime('%Y_%m')}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
