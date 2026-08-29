from django.apps import AppConfig


class IncomeConfig(AppConfig):
    name = 'income'

    def ready(self):
        import income.signals  # noqa: F401
