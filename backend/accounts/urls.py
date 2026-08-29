from django.urls import path
from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),

    # JWT Login
    path('login/', TokenObtainPairView.as_view(), name='login'),

    # Refresh access token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Doubles as /settings/ - GET to read, PATCH/PUT to update
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Password Reset
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
