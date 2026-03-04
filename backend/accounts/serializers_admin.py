from rest_framework import serializers
from django.contrib.auth import get_user_model
from .serializers import ExtendedUserSerializer
from appointments.models import Appointment, DoctorAvailability, Prescription, LabTestRequest
from appointments.serializers import (
    AppointmentSerializer, 
    PrescriptionSerializer, 
    LabTestRequestSerializer,
    DoctorAvailabilitySerializer
)
from pharmacy.models import PharmacyOrder, InventoryItem
from pharmacy.serializers import InventoryItemSerializer

User = get_user_model()

class AdminDoctorDetailSerializer(ExtendedUserSerializer):
    appointments = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    patients_treated_count = serializers.SerializerMethodField()
    
    class Meta(ExtendedUserSerializer.Meta):
        fields = ExtendedUserSerializer.Meta.fields + [
            'appointments', 'availability', 'patients_treated_count'
        ]

    def get_appointments(self, obj):
        qs = Appointment.objects.filter(doctor=obj).order_by('-date', '-time_slot')[:50]
        return AppointmentSerializer(qs, many=True).data

    def get_availability(self, obj):
        qs = DoctorAvailability.objects.filter(doctor=obj)
        return DoctorAvailabilitySerializer(qs, many=True).data

    def get_patients_treated_count(self, obj):
        return Appointment.objects.filter(doctor=obj, status='COMPLETED').values('patient').distinct().count()

class AdminPatientDetailSerializer(ExtendedUserSerializer):
    appointments = serializers.SerializerMethodField()
    prescriptions = serializers.SerializerMethodField()
    lab_requests = serializers.SerializerMethodField()

    class Meta(ExtendedUserSerializer.Meta):
        fields = ExtendedUserSerializer.Meta.fields + [
            'appointments', 'prescriptions', 'lab_requests'
        ]

    def get_appointments(self, obj):
        qs = Appointment.objects.filter(patient=obj).order_by('-date', '-time_slot')
        return AppointmentSerializer(qs, many=True).data

    def get_prescriptions(self, obj):
        qs = Prescription.objects.filter(patient=obj).order_by('-created_at')
        return PrescriptionSerializer(qs, many=True).data
    
    def get_lab_requests(self, obj):
        qs = LabTestRequest.objects.filter(patient=obj).order_by('-created_at')
        return LabTestRequestSerializer(qs, many=True).data

class AdminPharmacyDetailSerializer(ExtendedUserSerializer):
    processed_prescriptions = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()

    class Meta(ExtendedUserSerializer.Meta):
        fields = ExtendedUserSerializer.Meta.fields + [
            'processed_prescriptions', 'total_orders'
        ]
    
    def get_processed_prescriptions(self, obj):
        qs = Prescription.objects.filter(pharmacy=obj).order_by('-created_at')
        return PrescriptionSerializer(qs, many=True).data
    
    def get_total_orders(self, obj):
        return PharmacyOrder.objects.filter(pharmacy=obj).count()

class AdminPharmacyListItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()  # license or generated code
    status = serializers.CharField()
    total_orders = serializers.IntegerField()
    email = serializers.EmailField(allow_blank=True, required=False)
    phone = serializers.CharField(allow_blank=True, required=False)

class AdminPharmacyStatsSerializer(serializers.Serializer):
    pending_orders = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)

class AdminPharmacyInventorySerializer(serializers.Serializer):
    items = InventoryItemSerializer(many=True)

class AdminLabDetailSerializer(ExtendedUserSerializer):
    lab_requests = serializers.SerializerMethodField()

    class Meta(ExtendedUserSerializer.Meta):
        fields = ExtendedUserSerializer.Meta.fields + [
            'lab_requests'
        ]

    def get_lab_requests(self, obj):
        qs = LabTestRequest.objects.filter(lab=obj).order_by('-created_at')
        return LabTestRequestSerializer(qs, many=True).data
