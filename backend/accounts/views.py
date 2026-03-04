from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
import secrets
import string
import re
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import models
from .serializers import (
    RegisterSerializer,
    CreateStaffSerializer,
    UserSerializer,
    ExtendedUserSerializer,
    AdminUserUpdateSerializer,
    PatientProfileUpdateSerializer,
    DoctorProfileUpdateSerializer,
    PharmacyProfileUpdateSerializer,
    LabProfileUpdateSerializer,
    NotificationSerializer,
)
from .models import PatientProfile, DoctorProfile, PharmacyProfile, LabProfile, Notification, PasswordResetLog
from .permissions import IsAdmin
from .services import send_credentials_email, generate_temp_password, send_bulk_credentials, generate_strong_temp_password, send_password_reset_email
from django.db import transaction
from django.core.mail import send_mail

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class AdminCreateStaffView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    serializer_class = CreateStaffSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        role = data.get('role')
        temp_password = data.get('password')

        # Auto-generate password only if not provided
        if not temp_password:
            temp_password = generate_temp_password()
            data['password'] = temp_password  
        else:
            # Respect provided password
            temp_password = temp_password

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        role_upper = str(role).upper() if role else None
        if role_upper == User.Role.DOCTOR:
            DoctorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "specialization": request.data.get("specialization"),
                    "phone": request.data.get("phone"),
                },
            )
        elif role_upper == User.Role.PHARMACY:
            PharmacyProfile.objects.get_or_create(
                user=user,
                defaults={
                    "license_number": request.data.get("licenseNumber") or request.data.get("license_number"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )
        elif role_upper == User.Role.LAB:
            LabProfile.objects.get_or_create(
                user=user,
                defaults={
                    "license_number": request.data.get("licenseNumber") or request.data.get("license_number"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )
        elif role_upper == User.Role.PATIENT:
            PatientProfile.objects.get_or_create(
                user=user,
                defaults={
                    "age": request.data.get("age"),
                    "gender": request.data.get("gender"),
                    "phone": request.data.get("phone"),
                    "address": request.data.get("address"),
                },
            )

        log = None
        email_sent = False
        if user.email:
            try:
                log = send_credentials_email(user, temp_password)
                email_sent = bool(log and log.success)
            except Exception:
                email_sent = False

        headers = self.get_success_headers(serializer.data)
        return Response({"user": UserSerializer(user).data, "temp_password": temp_password, "email_sent": email_sent}, status=status.HTTP_201_CREATED, headers=headers)

class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_object(self):
        return self.request.user

class UsersListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs = User.objects.all().order_by('-date_joined')
        if role:
            qs = qs.filter(role=role.upper())
        return qs

class DoctorsPublicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        specialization = self.request.query_params.get('specialization')
        qs = User.objects.filter(role=User.Role.DOCTOR).order_by('username')
        if specialization:
            qs = qs.filter(doctor_profile__specialization__iexact=specialization)
        return qs

class LabsPublicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.LAB).order_by('username')
        return qs

class PharmaciesPublicListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ExtendedUserSerializer

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.PHARMACY).order_by('username')
        return qs

class AdminUserUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer

class PatientProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.PATIENT:
            return Response({"detail": "Not a patient"}, status=status.HTTP_403_FORBIDDEN)
        serializer = PatientProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class DoctorProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.DOCTOR:
            return Response({"detail": "Not a doctor"}, status=status.HTTP_403_FORBIDDEN)
        serializer = DoctorProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class AvatarUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        file = request.FILES.get("avatar")
        if not file:
            return Response({"detail": "avatar required"}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.avatar = file
        user.save()
        return Response(ExtendedUserSerializer(user).data, status=status.HTTP_200_OK)

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        if username_or_email:
            try:
                u = User.objects.get(email=username_or_email)
                attrs["username"] = u.username
            except User.DoesNotExist:
                pass
        data = super().validate(attrs)
        user = getattr(self, "user", None)
        if user:
            if getattr(user, "force_password_change", False):
                exp = getattr(user, "password_reset_expires", None)
                if exp and timezone.now() > exp:
                    raise self.fail("no_active_account")
                if getattr(user, "password_reset_used", False):
                    raise self.fail("no_active_account")
                user.password_reset_used = True
                user.save(update_fields=["password_reset_used"])
                data["must_change_password"] = True
                data["password_reset_expires"] = exp.isoformat() if exp else None
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class PharmacyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.PHARMACY:
            return Response({"detail": "Not a pharmacy"}, status=status.HTTP_403_FORBIDDEN)
        serializer = PharmacyProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class LabProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.LAB:
            return Response({"detail": "Not a lab"}, status=status.HTTP_403_FORBIDDEN)
        serializer = LabProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(ExtendedUserSerializer(request.user).data)

class AdminProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(ExtendedUserSerializer(request.user).data)

    def patch(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Not an admin"}, status=status.HTTP_403_FORBIDDEN)
        # Allow updating first_name, last_name, email only
        data = {k: request.data.get(k) for k in ['first_name', 'last_name', 'email'] if k in request.data}
        for f, v in data.items():
            setattr(request.user, f, v)
        request.user.save()
        return Response(ExtendedUserSerializer(request.user).data)

class SendCredentialsView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        password = request.data.get("password")
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "user not found"}, status=status.HTTP_404_NOT_FOUND)
        if not password:
            password = generate_temp_password()
            user.set_password(password)
            user.save(update_fields=["password"])
        log = send_credentials_email(user, password)
        return Response({"sent": bool(log and log.success), "attempts": getattr(log, "attempts", None)})

class AdminBulkCreateUsersView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request):
        payload = request.data if isinstance(request.data, list) else request.data.get("users", [])
        if not isinstance(payload, list):
            return Response({"detail": "users must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        with transaction.atomic():
            for item in payload:
                data = dict(item)
                pwd = data.get("password") or generate_temp_password()
                if "password" not in data:
                    data["password"] = pwd
                ser = CreateStaffSerializer(data=data)
                ser.is_valid(raise_exception=True)
                u = ser.save()
                role_upper = str(data.get("role")).upper() if data.get("role") else None
                if role_upper == User.Role.DOCTOR:
                    DoctorProfile.objects.get_or_create(user=u)
                elif role_upper == User.Role.PHARMACY:
                    PharmacyProfile.objects.get_or_create(user=u)
                elif role_upper == User.Role.LAB:
                    LabProfile.objects.get_or_create(user=u)
                elif role_upper == User.Role.PATIENT:
                    PatientProfile.objects.get_or_create(user=u)
                created.append((u, pwd))
        logs = send_bulk_credentials(created)
        result = []
        for idx, tup in enumerate(created):
            u, pwd = tup
            lg = logs[idx] if idx < len(logs) else None
            result.append({"user": UserSerializer(u).data, "temp_password": pwd, "email_sent": bool(lg and lg.success)})
        return Response({"created": result}, status=status.HTTP_201_CREATED)

class AdminTestEmailView(APIView):
    permission_classes = [IsAdmin]
    def post(self, request):
        to = request.data.get("to")
        if not to:
            return Response({"detail": "to is required"}, status=status.HTTP_400_BAD_REQUEST)
        subject = "CureOn SMTP Test"
        message = "This is a test email from CureOn."
        try:
            send_mail(subject, message, getattr(settings, "DEFAULT_FROM_EMAIL", None), [to], fail_silently=False)
            return Response({
                "sent": True,
                "backend": getattr(settings, "EMAIL_BACKEND", None),
                "host": getattr(settings, "EMAIL_HOST", None),
                "port": getattr(settings, "EMAIL_PORT", None),
                "use_tls": getattr(settings, "EMAIL_USE_TLS", None),
                "use_ssl": getattr(settings, "EMAIL_USE_SSL", None),
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", None),
                "to": to
            })
        except Exception as e:
            return Response({
                "sent": False,
                "error": str(e),
                "backend": getattr(settings, "EMAIL_BACKEND", None),
                "host": getattr(settings, "EMAIL_HOST", None),
                "port": getattr(settings, "EMAIL_PORT", None),
                "use_tls": getattr(settings, "EMAIL_USE_TLS", None),
                "use_ssl": getattr(settings, "EMAIL_USE_SSL", None),
                "from": getattr(settings, "DEFAULT_FROM_EMAIL", None),
                "to": to
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get("current_password")
        new = request.data.get("new_password")
        if not current or not new:
            return Response({"detail": "current_password and new_password are required"}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        if not user.check_password(current):
            return Response({"detail": "Incorrect current password"}, status=status.HTTP_400_BAD_REQUEST)
        special_pattern = r"[!@#$%^&*()_+\-=\[\]{};:'\",.<>/?|`~]"
        if len(new) < 8 or not re.search(r"[A-Z]", new) or not re.search(r"[a-z]", new) or not re.search(r"[0-9]", new) or not re.search(special_pattern, new):
            return Response({"detail": "New password must be 8+ chars and include uppercase, lowercase, digit, special"}, status=status.HTTP_400_BAD_REQUEST)
        if new == current:
            return Response({"detail": "New password must be different from current password"}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new)
        user.force_password_change = False
        user.password_reset_expires = None
        user.password_reset_used = True
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "force_password_change", "password_reset_expires", "password_reset_used", "password_changed_at"])
        return Response({"detail": "Password updated"}, status=status.HTTP_200_OK)

class ChangeUsernameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_username = request.data.get("new_username")
        if not new_username:
            return Response({"detail": "new_username is required"}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_username) < 3 or len(new_username) > 150:
            return Response({"detail": "Username must be between 3 and 150 characters"}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r"^[a-zA-Z0-9_.-]+$", new_username):
            return Response({"detail": "Username can contain letters, numbers, ., _, -"}, status=status.HTTP_400_BAD_REQUEST)
        if new_username.lower() == request.user.username.lower():
            return Response({"detail": "New username must be different"}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username__iexact=new_username).exists():
            return Response({"detail": "Username already taken"}, status=status.HTTP_400_BAD_REQUEST)
        request.user.username = new_username
        request.user.save(update_fields=["username"])
        return Response({"detail": "Username updated"}, status=status.HTTP_200_OK)

class NotificationsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        unread_only = request.query_params.get("unread") == "1"
        limit = request.query_params.get("limit")
        qs = Notification.objects.filter(recipient=request.user)
        if unread_only:
            qs = qs.filter(is_read=False)
        qs = qs.order_by("-created_at")
        if limit:
            try:
                n = int(limit)
                qs = qs[:n]
            except Exception:
                pass
        return Response(NotificationSerializer(qs, many=True).data)

class NotificationsUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        c = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread": c})

class NotificationsMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, pk):
        try:
            obj = Notification.objects.get(id=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)
        obj.is_read = True
        obj.save(update_fields=["is_read"])
        return Response(NotificationSerializer(obj).data)

class NotificationsMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"marked": True})

class ForgotPasswordThrottle(throttling.ScopedRateThrottle):
    scope = "forgot_password"

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        username = request.data.get("username")
        captcha_token = request.data.get("captcha_token")
        ip = request.META.get("REMOTE_ADDR")
        if not username or not str(username).strip():
            return Response({"detail": "username is required"}, status=status.HTTP_400_BAD_REQUEST)
        threshold = getattr(settings, "FORGOT_PASSWORD_CAPTCHA_THRESHOLD", 3)
        recent_count = PasswordResetLog.objects.filter(ip_address=ip, created_at__gte=timezone.now() - timedelta(hours=1)).count() if ip else 0
        if not getattr(settings, "DEBUG", False) and recent_count >= threshold and not captcha_token:
            PasswordResetLog.objects.create(username=username, ip_address=ip, success=False, error="captcha_required")
            return Response({"detail": "captcha_required"}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        try:
            user = User.objects.get(models.Q(username__iexact=username) | models.Q(email__iexact=username))
        except Exception:
            PasswordResetLog.objects.create(username=username, ip_address=ip, success=False, error="user_not_found")
            return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        temp_pwd = generate_strong_temp_password()
        user.set_password(temp_pwd)
        user.password_reset_expires = timezone.now() + timedelta(hours=24)
        user.password_reset_used = False
        user.force_password_change = True
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_reset_expires", "password_reset_used", "force_password_change", "password_changed_at"])
        log = None
        email_sent = False
        if user.email:
            try:
                log = send_password_reset_email(user, temp_pwd)
                email_sent = bool(log and log.success)
            except Exception:
                email_sent = False
        PasswordResetLog.objects.create(username=user.username, ip_address=ip, success=email_sent, error=None if email_sent else "email_failed")
        return Response({"email_sent": email_sent}, status=status.HTTP_200_OK)
