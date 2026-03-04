from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from .models import Equipment
from .serializers import EquipmentSerializer
from .permissions import CanManageEquipment
from django.contrib.auth import get_user_model


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all().order_by("asset_id")
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated, CanManageEquipment]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and getattr(user, "role", None) == "LAB" and not getattr(user, "is_superuser", False):
            qs = qs.filter(lab=user)
        # Allow admins to filter by lab_id
        lab_id = self.request.query_params.get("lab_id")
        if lab_id:
            try:
                qs = qs.filter(lab_id=int(lab_id))
            except Exception:
                pass
        search = self.request.query_params.get("search")
        status_param = self.request.query_params.get("status")
        if search:
            s = search.strip()
            qs = qs.filter(Q(name__icontains=s) | Q(model__icontains=s) | Q(asset_id__icontains=s))
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        serializer.save(lab=user if getattr(user, "role", None) == "LAB" else None)

    @action(detail=True, methods=["post"], url_path="schedule-maintenance")
    def schedule_maintenance(self, request, pk=None):
        eq = self.get_object()
        next_date = request.data.get("next_maintenance")
        status_value = request.data.get("status") or Equipment.Status.MAINTENANCE
        notes = request.data.get("notes")

        if not next_date:
            return Response({"detail": "next_maintenance is required"}, status=status.HTTP_400_BAD_REQUEST)

        eq.next_maintenance = next_date
        if status_value in dict(Equipment.Status.choices):
            eq.status = status_value
        eq.last_maintenance = timezone.now().date()
        eq.save()

        data = EquipmentSerializer(eq).data
        data["notes"] = notes
        return Response(data)

    @action(detail=True, methods=["post"], url_path="report-issue")
    def report_issue(self, request, pk=None):
        eq = self.get_object()
        issue_type = request.data.get("issue_type", "")
        description = request.data.get("description", "")

        eq.issue_type = issue_type
        eq.issue_description = description
        eq.status = Equipment.Status.REPORTED
        eq.reported_by = request.user
        eq.save()

        return Response(EquipmentSerializer(eq).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="resolve-issue")
    def resolve_issue(self, request, pk=None):
        eq = self.get_object()
        next_status = request.data.get("status") or Equipment.Status.OPERATIONAL
        if next_status not in dict(Equipment.Status.choices):
            next_status = Equipment.Status.OPERATIONAL
        eq.status = next_status
        eq.issue_type = ""
        eq.issue_description = ""
        eq.save()
        return Response(EquipmentSerializer(eq).data, status=status.HTTP_200_OK)
