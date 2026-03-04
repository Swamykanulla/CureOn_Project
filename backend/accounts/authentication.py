from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class SafeJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        changed_at = getattr(user, "password_changed_at", None)
        if changed_at:
            iat = validated_token.get("iat")
            if iat and int(iat) < int(changed_at.timestamp()):
                raise exceptions.AuthenticationFailed("Token issued before password change", code="token_stale")
        return user
