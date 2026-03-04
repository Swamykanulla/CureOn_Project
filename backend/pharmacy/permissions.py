from rest_framework.permissions import BasePermission


class CanManageInventory(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = getattr(request.user, "role", None)
        return role in ("PHARMACY", "ADMIN") or getattr(request.user, "is_superuser", False)
