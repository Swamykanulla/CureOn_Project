from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, F
from django.contrib.auth import get_user_model
from .permissions import IsAdmin
from .serializers_admin import (
    AdminDoctorDetailSerializer,
    AdminPatientDetailSerializer,
    AdminPharmacyDetailSerializer,
    AdminLabDetailSerializer,
    AdminPharmacyListItemSerializer,
    AdminPharmacyStatsSerializer,
)
from pharmacy.models import PharmacyOrder, InventoryItem

User = get_user_model()

class AdminDoctorDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.DOCTOR)
    serializer_class = AdminDoctorDetailSerializer
    lookup_field = 'id'

class AdminPatientDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.PATIENT)
    serializer_class = AdminPatientDetailSerializer
    lookup_field = 'id'

class AdminPharmacyDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.PHARMACY)
    serializer_class = AdminPharmacyDetailSerializer
    lookup_field = 'id'

class AdminLabDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role=User.Role.LAB)
    serializer_class = AdminLabDetailSerializer
    lookup_field = 'id'

class AdminPharmaciesListView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request):
        pharmacies = User.objects.filter(role=User.Role.PHARMACY)
        items = []
        for u in pharmacies:
            name = f"{u.first_name} {u.last_name}".strip() or u.username
            code = getattr(u, "license_number", "") or f"PH-{u.id:04d}"
            status = "Active" if u.is_active else "Inactive"
            total_orders = PharmacyOrder.objects.filter(pharmacy=u).count()
            items.append({
                "id": u.id,
                "name": name,
                "code": code,
                "status": status,
                "total_orders": total_orders,
                "email": u.email or "",
                "phone": getattr(u, "phone", "") or "",
            })
        return Response(AdminPharmacyListItemSerializer(items, many=True).data)

class AdminPharmacyInventoryView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, id):
        items = InventoryItem.objects.filter(created_by_id=id).order_by("name")
        return Response({"items": [ 
            {
                "id": i.id,
                "name": i.name,
                "category": i.category,
                "stock": i.stock,
                "min_stock": i.min_stock,
                "price": i.price,
                "expiry": i.expiry,
                "supplier": i.supplier,
                "created_at": i.created_at,
                "updated_at": i.updated_at,
            } for i in items
        ]})

class AdminPharmacyStatsView(APIView):
    permission_classes = [IsAdmin]
    def get(self, request, id):
        pending_orders = PharmacyOrder.objects.filter(pharmacy_id=id).exclude(status=PharmacyOrder.Status.COMPLETED).count()
        low_stock_items = InventoryItem.objects.filter(created_by_id=id, stock__lt=F("min_stock")).count()
        total_revenue = PharmacyOrder.objects.filter(pharmacy_id=id, status=PharmacyOrder.Status.COMPLETED).aggregate(total=Sum("total_amount"))["total"] or 0
        data = {"pending_orders": pending_orders, "low_stock_items": low_stock_items, "total_revenue": total_revenue}
        return Response(AdminPharmacyStatsSerializer(data).data)
