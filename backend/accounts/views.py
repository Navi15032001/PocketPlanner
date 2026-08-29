import os
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Doubles as the Settings endpoint - currency, language, theme,
    monthly income and profile picture are all here.
    """
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Password updated successfully.'},
            status=status.HTTP_200_OK
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        client_frontend_url = serializer.validated_data.get('frontend_url')

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # Also check username match
            user = User.objects.filter(username__iexact=email).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # Determine base URL for reset link
            if client_frontend_url and client_frontend_url.startswith(('http://', 'https://')):
                base_reset_page = client_frontend_url
            else:
                origin = request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER')
                if origin and origin.startswith(('http://', 'https://')):
                    base_reset_page = origin.rstrip('/').split('?')[0]
                    if not base_reset_page.endswith('reset-password.html'):
                        base_reset_page = base_reset_page.rsplit('/', 1)[0] + '/reset-password.html'
                else:
                    base_reset_page = os.getenv('FRONTEND_URL', 'http://127.0.0.1:5500/frontend/reset-password.html')

            full_reset_url = f"{base_reset_page}?uid={uid}&token={token}"

            plain_text_message = (
                f"Hello {user.username},\n\n"
                f"You requested a password reset for your PocketPlanner account.\n\n"
                f"Click the link below to set a new password:\n"
                f"{full_reset_url}\n\n"
                f"Your Token (if needed manually): {token}\n"
                f"Your User ID: {uid}\n\n"
                f"If you did not request this change, please ignore this email.\n\n"
                f"— The PocketPlanner Security Team"
            )

            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
                <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 36px 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
                        <span style="font-size: 26px;">💳</span>
                        <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Pocket<span style="color: #4f46e5;">Planner</span></span>
                    </div>

                    <h2 style="font-size: 20px; font-weight: 800; margin: 0 0 12px; color: #0f172a;">Password Reset Request</h2>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
                        Hello <strong>{user.username}</strong>,<br><br>
                        We received a request to reset your password. Click the button below to choose a new, secure password for your account:
                    </p>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="{full_reset_url}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(79,70,229,0.3);">
                            Reset Password →
                        </a>
                    </div>

                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
                        <p style="margin: 0 0 8px;"><strong>If the button above doesn't work</strong>, copy and paste this link into your browser:</p>
                        <a href="{full_reset_url}" style="color: #4f46e5; word-break: break-all; text-decoration: underline;">{full_reset_url}</a>
                    </div>

                    <div style="margin-top: 20px; font-size: 11px; color: #94a3b8;">
                        If you did not request this password reset, no action is needed. Your account remains completely secure.
                    </div>
                </div>
            </body>
            </html>
            """

            try:
                send_mail(
                    subject="PocketPlanner - Password Reset Link",
                    message=plain_text_message,
                    html_message=html_message,
                    from_email=None,
                    recipient_list=[user.email or email],
                    fail_silently=False
                )
            except Exception as e:
                print(f"[Email Error]: {e}")

        return Response({
            'detail': 'If an account with this email exists, a password reset link has been sent to your registered email address. Please check your inbox (and spam folder).'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Password has been reset successfully. You can now sign in with your new password.'},
            status=status.HTTP_200_OK
        )
