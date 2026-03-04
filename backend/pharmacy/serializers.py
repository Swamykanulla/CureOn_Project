from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import InventoryItem, Transaction, PharmacyOrder, PharmacyOrderItem


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "category",
            "stock",
            "min_stock",
            "price",
            "expiry",
            "supplier",
            "created_at",
            "updated_at",
        ]


class InventoryStatsSerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    low_stock = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class TransactionSerializer(serializers.ModelSerializer):
    transaction_id = serializers.CharField(source="trx_code", read_only=True)
    user_display = serializers.SerializerMethodField()
    item_name = serializers.CharField(source="item.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "transaction_id",
            "created_at",
            "type",
            "details",
            "amount",
            "status",
            "user_display",
            "item",
            "item_name",
            "quantity",
        ]
        read_only_fields = ["id", "transaction_id", "created_at", "user_display", "item_name"]

    def get_user_display(self, obj):
        # Try to show patient name for sales derived from orders
        try:
            from .models import PharmacyOrder
            import re
            m = re.search(r"Order\s+(ORD-\d+)", obj.details or "")
            if m:
                code = m.group(1)
                o = PharmacyOrder.objects.select_related("patient").filter(code=code).first()
                if o and o.patient:
                    full = f"{getattr(o.patient, 'first_name', '')} {getattr(o.patient, 'last_name', '')}".strip()
                    return full or o.patient.username
        except Exception:
            pass
        if obj.user:
            full = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full or obj.user.username
        return "System"


class CatalogItemSerializer(serializers.ModelSerializer):
    pharmacy_id = serializers.IntegerField(source="created_by.id", read_only=True)
    pharmacy_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "category",
            "stock",
            "min_stock",
            "price",
            "expiry",
            "supplier",
            "pharmacy_id",
            "pharmacy_name",
        ]

    def get_pharmacy_name(self, obj):
        u = getattr(obj, "created_by", None)
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username


class PharmacyOrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    amount = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyOrderItem
        fields = ["id", "item", "item_name", "name", "quantity", "unit_price", "amount"]
        read_only_fields = ["id", "item_name", "amount"]

    def get_amount(self, obj):
        return obj.amount


class PharmacyOrderSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source="code", read_only=True)
    pharmacy_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    items = PharmacyOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = PharmacyOrder
        fields = [
            "id",
            "order_id",
            "prescription_id",
            "patient",
            "patient_name",
            "pharmacy",
            "pharmacy_name",
            "status",
            "total_amount",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = ["id", "order_id", "total_amount", "created_at", "updated_at", "patient_name", "pharmacy_name", "items"]

    def get_pharmacy_name(self, obj):
        u = obj.pharmacy
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_patient_name(self, obj):
        u = obj.patient
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username
