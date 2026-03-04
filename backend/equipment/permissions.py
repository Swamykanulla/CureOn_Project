from rest_framework.permissions import BasePermission, SAFE_METHODS


class CanManageEquipment(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        if not request.user.is_authenticated:
            return False
        return request.user.role in ("LAB", "ADMIN") or request.user.is_superuser
