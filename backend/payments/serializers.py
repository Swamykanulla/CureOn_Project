from django.shortcuts import get_object_or_404
from rest_framework import serializers

from appointments.models import Appointment
from .models import Payment


class PaymentSubmitSerializer(serializers.ModelSerializer):
    appointment_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "appointment_id",
            "transaction_id",
            "screenshot",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate_appointment_id(self, value):
        request = self.context["request"]
        appointment = get_object_or_404(Appointment, pk=value)
        if appointment.patient_id != request.user.id:
            raise serializers.ValidationError(
                "You can submit payment only for your own appointment."
            )
        if Payment.objects.filter(
            appointment=appointment, user=request.user, status=Payment.Status.APPROVED
        ).exists():
            raise serializers.ValidationError("Payment is already approved for this appointment.")
        self.context["appointment_obj"] = appointment
        return value

    def validate_screenshot(self, value):
        allowed_types = {"image/jpeg", "image/jpg", "image/png"}
        content_type = getattr(value, "content_type", "")
        if content_type not in allowed_types:
            raise serializers.ValidationError(
                "Screenshot must be JPG, JPEG, or PNG."
            )
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Screenshot must not exceed 5MB.")
        return value

    def validate_transaction_id(self, value):
        txn = (value or "").strip()
        if not txn:
            raise serializers.ValidationError("Transaction ID is required.")
        return txn

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        appointment = self.context.get("appointment_obj")
        existing = None
        if appointment:
            existing = (
                Payment.objects.filter(
                    appointment=appointment,
                    user=request.user,
                    status__in=[Payment.Status.PENDING, Payment.Status.REJECTED],
                )
                .order_by("-created_at")
                .first()
            )
        self.context["existing_payment_obj"] = existing

        txn = attrs.get("transaction_id")
        if txn:
            qs = Payment.objects.filter(transaction_id=txn)
            if existing:
                qs = qs.exclude(pk=existing.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"transaction_id": ["Transaction ID already exists."]}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop("appointment_id", None)
        existing = self.context.get("existing_payment_obj")
        if existing:
            existing.transaction_id = validated_data["transaction_id"]
            existing.screenshot = validated_data["screenshot"]
            existing.status = Payment.Status.PENDING
            existing.save(update_fields=["transaction_id", "screenshot", "status", "updated_at"])
            return existing
        return Payment.objects.create(
            user=self.context["request"].user,
            appointment=self.context["appointment_obj"],
            **validated_data,
        )


class PaymentAdminListSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    appointment_label = serializers.SerializerMethodField()
    screenshot_url = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "user",
            "user_name",
            "appointment",
            "appointment_label",
            "transaction_id",
            "screenshot",
            "screenshot_url",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_user_name(self, obj):
        u = obj.user
        full_name = f"{u.first_name} {u.last_name}".strip()
        return full_name or u.username

    def get_appointment_label(self, obj):
        appointment = obj.appointment
        return (
            f"#{appointment.id} - {appointment.date} {appointment.time_slot}"
        )

    def get_screenshot_url(self, obj):
        request = self.context.get("request")
        try:
            url = obj.screenshot.url
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return None
