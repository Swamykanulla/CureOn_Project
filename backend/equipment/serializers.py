from rest_framework import serializers
from .models import Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    lab = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Equipment
        fields = [
            "id",
            "lab",
            "asset_id",
            "name",
            "model",
            "location",
            "status",
            "last_maintenance",
            "next_maintenance",
            "issue_type",
            "issue_description",
            "reported_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "reported_by", "created_at", "updated_at"]

    def validate_asset_id(self, value: str):
        v = value.strip()
        if not v:
            raise serializers.ValidationError("Asset ID is required")
        return v

    def validate_name(self, value: str):
        v = value.strip()
        if not v:
            raise serializers.ValidationError("Name is required")
        return v
