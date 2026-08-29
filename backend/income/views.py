import csv
import io
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser

from .models import Income
from .serializers import IncomeSerializer


VALID_INCOME_TYPES = {'SALARY', 'FREELANCE', 'BUSINESS', 'BONUS', 'OTHER'}


class IncomeViewSet(viewsets.ModelViewSet):

    serializer_class = IncomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Income.objects.filter(
            user=self.request.user
        ).order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user
        )

    @action(
        detail=False,
        methods=['post'],
        url_path='import-csv',
        parser_classes=[MultiPartParser]
    )
    def import_csv(self, request):
        """
        Expects a multipart/form-data POST with a 'file' field.
        CSV columns (header row required, case-insensitive):
        date, title, amount, income_type, description

        - date: YYYY-MM-DD
        - title: text
        - amount: number
        - income_type: SALARY / FREELANCE / BUSINESS / BONUS / OTHER
          (defaults to OTHER if blank or unrecognized)
        - description: optional text
        """

        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response(
                {'detail': "No file uploaded. Send it as 'file' in form-data."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            decoded = uploaded_file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response(
                {'detail': "Could not read file. Please upload a UTF-8 CSV."},
                status=status.HTTP_400_BAD_REQUEST
            )

        reader = csv.DictReader(io.StringIO(decoded))
        reader.fieldnames = [
            (f or '').strip().lower() for f in (reader.fieldnames or [])
        ]

        required = {'date', 'amount', 'title'}
        if not required.issubset(set(reader.fieldnames)):
            return Response(
                {'detail': "CSV must have at least 'date', 'title' and 'amount' columns."},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        errors = []

        for row_number, row in enumerate(reader, start=2):

            date_str = (row.get('date') or '').strip()
            title = (row.get('title') or '').strip()
            amount_str = (row.get('amount') or '').strip()
            income_type = (row.get('income_type') or '').strip().upper()
            description = (row.get('description') or '').strip()

            if not date_str or not amount_str or not title:
                errors.append(f"Row {row_number}: missing date, title or amount, skipped.")
                continue

            try:
                amount = Decimal(amount_str)
                if amount <= 0:
                    raise InvalidOperation
            except InvalidOperation:
                errors.append(f"Row {row_number}: invalid amount '{amount_str}', skipped.")
                continue

            if income_type not in VALID_INCOME_TYPES:
                income_type = 'OTHER'

            try:
                Income.objects.create(
                    user=request.user,
                    title=title,
                    amount=amount,
                    income_type=income_type,
                    description=description,
                    date=date_str
                )
                created_count += 1
            except Exception as exc:
                errors.append(f"Row {row_number}: {exc}")

        return Response({
            'created': created_count,
            'errors': errors
        }, status=status.HTTP_200_OK)
