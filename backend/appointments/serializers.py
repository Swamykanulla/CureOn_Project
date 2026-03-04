from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Appointment, DoctorAvailability, Prescription, PrescriptionItem, LabTestRequest, LabTestRecord

User = get_user_model()


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ["id", "doctor", "weekday", "start_time", "end_time"]
        read_only_fields = ["doctor"]


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()
    diagnosis = serializers.SerializerMethodField()
    doctor_avatar = serializers.SerializerMethodField()
    patient_avatar = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_transaction_id = serializers.SerializerMethodField()
    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "doctor",
            "date",
            "time_slot",
            "status",
            "visit_type",
            "video_url",
            "is_paid",
            "payment_status",
            "payment_transaction_id",
            "requested_date",
            "requested_time_slot",
            "created_at",
            "updated_at",
            "doctor_name",
            "patient_name",
            "doctor_specialization",
            "diagnosis",
            "doctor_avatar",
            "patient_avatar",
        ]
        read_only_fields = ["patient", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        doctor = attrs.get("doctor")
        date = attrs.get("date")
        time_slot = attrs.get("time_slot")
        if doctor and date and time_slot:
            if Appointment.objects.filter(doctor=doctor, date=date, time_slot=time_slot).exists():
                raise serializers.ValidationError("This slot is already booked for the doctor.")
        return attrs

    def get_doctor_name(self, obj):
        d = getattr(obj, "doctor", None)
        if d:
            full = f"{getattr(d, 'first_name', '')} {getattr(d, 'last_name', '')}".strip()
            return full or d.username
        return None

    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if p:
            full = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip()
            return full or p.username
        return None
    def get_doctor_avatar(self, obj):
        d = getattr(obj, "doctor", None)
        f = getattr(d, "avatar", None) if d else None
        try:
            return f.url if f else None
        except Exception:
            return None
    def get_patient_avatar(self, obj):
        p = getattr(obj, "patient", None)
        f = getattr(p, "avatar", None) if p else None
        try:
            return f.url if f else None
        except Exception:
            return None

    def get_doctor_specialization(self, obj):
        d = getattr(obj, "doctor", None)
        prof = getattr(d, "doctor_profile", None) if d else None
        return getattr(prof, "specialization", None)

    def get_diagnosis(self, obj):
        presc = getattr(obj, "prescription", None)
        return getattr(presc, "diagnosis", None)

    def get_payment_status(self, obj):
        payment = obj.payments.order_by("-created_at").first()
        return payment.status if payment else None

    def get_payment_transaction_id(self, obj):
        payment = obj.payments.order_by("-created_at").first()
        return payment.transaction_id if payment else None

class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ["id", "name", "dosage", "frequency", "duration", "quantity", "unit_price"]

class PrescriptionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    items = PrescriptionItemSerializer(many=True)
    class Meta:
        model = Prescription
        fields = [
            "id",
            "appointment",
            "patient",
            "doctor",
            "diagnosis",
            "notes",
            "status",
            "pharmacy_status",
            "total_amount",
            "bill_attachment",
            "created_at",
            "updated_at",
            "doctor_name",
            "patient_name",
            "items",
        ]
        read_only_fields = ["patient", "doctor", "created_at", "updated_at"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        prescription = Prescription.objects.create(**validated_data)
        for item in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription

    def get_doctor_name(self, obj):
        d = getattr(obj, "doctor", None)
        if d:
            full = f"{getattr(d, 'first_name', '')} {getattr(d, 'last_name', '')}".strip()
            return full or d.username
        return None

    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if p:
            full = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip()
            return full or p.username
        return None

class LabTestRequestSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    lab_name = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()
    class Meta:
        model = LabTestRequest
        fields = [
            "id",
            "appointment",
            "patient",
            "doctor",
            "lab",
            "tests",
            "notes",
            "priority",
            "status",
            "created_at",
            "updated_at",
            "doctor_name",
            "patient_name",
            "lab_name",
            "result_value",
            "reference_range",
            "clinical_notes",
            "attachment",
            "uploaded_by",
        ]
        read_only_fields = ["patient", "doctor", "created_at", "updated_at"]
    def get_doctor_name(self, obj):
        d = getattr(obj, "doctor", None)
        if d:
            full = f"{getattr(d, 'first_name', '')} {getattr(d, 'last_name', '')}".strip()
            return full or d.username
        return None
    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if p:
            full = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip()
            return full or p.username
        return None
    def get_lab_name(self, obj):
        l = getattr(obj, "lab", None)
        if l:
            full = f"{getattr(l, 'first_name', '')} {getattr(l, 'last_name', '')}".strip()
            return full or l.username
        return None
    def get_uploaded_by(self, obj):
        if not obj.attachment:
            return None
        notes = getattr(obj, "clinical_notes", "") or ""
        if "[UPLOADED_BY_DOCTOR]" in notes:
            return "Doctor"
        d = getattr(obj, "doctor", None)
        if d and getattr(d, "role", None) == User.Role.PATIENT:
            return "Patient"
        return "Lab" if getattr(obj, "lab", None) else "Doctor"


class LabTestRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    lab_name = serializers.SerializerMethodField()
    class Meta:
        model = LabTestRecord
        fields = [
            "id",
            "test_id",
            "date",
            "patient",
            "doctor",
            "lab",
            "test_type",
            "result_summary",
            "result_details",
            "attachment",
            "request",
            "created_at",
            "updated_at",
            "patient_name",
            "doctor_name",
            "lab_name",
        ]
        read_only_fields = ["created_at", "updated_at"]
    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if p:
            full = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip()
            return full or p.username
        return None
    def get_doctor_name(self, obj):
        d = getattr(obj, "doctor", None)
        if d:
            full = f"{getattr(d, 'first_name', '')} {getattr(d, 'last_name', '')}".strip()
            return full or d.username
        return None
    def get_lab_name(self, obj):
        l = getattr(obj, "lab", None)
        if l:
            full = f"{getattr(l, 'first_name', '')} {getattr(l, 'last_name', '')}".strip()
            return full or l.username
        return None
