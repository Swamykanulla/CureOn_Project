from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PatientProfile, DoctorProfile, PharmacyProfile, LabProfile, Notification
from django.db import transaction

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_active', 'date_joined']

class ExtendedUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    profile_code = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    license_number = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()
    blood_type = serializers.SerializerMethodField()
    height_cm = serializers.SerializerMethodField()
    weight_kg = serializers.SerializerMethodField()
    allergies = serializers.SerializerMethodField()
    chronic_diseases = serializers.SerializerMethodField()
    past_diseases = serializers.SerializerMethodField()
    family_history = serializers.SerializerMethodField()
    hospital_name = serializers.SerializerMethodField()
    experience_years = serializers.SerializerMethodField()
    about = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_active', 'date_joined', 'first_name', 'last_name',
                  'specialization', 'phone', 'license_number', 'address', 'age', 'gender', 'date_of_birth',
                  'blood_type', 'height_cm', 'weight_kg', 'allergies', 'chronic_diseases', 'past_diseases',
                  'family_history', 'hospital_name', 'experience_years', 'about', 'avatar', 'profile_code', 'must_change_password']

    def get_specialization(self, obj):
        p = getattr(obj, 'doctor_profile', None)
        return p.specialization if p else None
    def get_avatar(self, obj):
        f = getattr(obj, 'avatar', None)
        try:
            return f.url if f else None
        except Exception:
            return None

    def get_profile_code(self, obj):
        try:
            year = getattr(obj, "date_joined", None).year if getattr(obj, "date_joined", None) else None
            if not year:
                year = 0
            if obj.role == User.Role.DOCTOR:
                qs = User.objects.filter(role=User.Role.DOCTOR, date_joined__year=year)
                serial = qs.filter(id__lte=obj.id).count()
                return f"#DR-{year}-{serial:03d}"
            if obj.role == User.Role.PATIENT:
                qs = User.objects.filter(role=User.Role.PATIENT, date_joined__year=year)
                serial = qs.filter(id__lte=obj.id).count()
                return f"PT-{year}-{serial:03d}"
            return None
        except Exception:
            return None

    def get_phone(self, obj):
        if obj.role == User.Role.DOCTOR:
            p = getattr(obj, 'doctor_profile', None)
            return p.phone if p else None
        if obj.role == User.Role.PHARMACY:
            p = getattr(obj, 'pharmacy_profile', None)
            return p.phone if p else None
        if obj.role == User.Role.LAB:
            p = getattr(obj, 'lab_profile', None)
            return p.phone if p else None
        if obj.role == User.Role.PATIENT:
            p = getattr(obj, 'patient_profile', None)
            return p.phone if p else None
        return None

    def get_license_number(self, obj):
        if obj.role == User.Role.DOCTOR:
            p = getattr(obj, 'doctor_profile', None)
            return p.license_number if p else None
        if obj.role == User.Role.PHARMACY:
            p = getattr(obj, 'pharmacy_profile', None)
            return p.license_number if p else None
        if obj.role == User.Role.LAB:
            p = getattr(obj, 'lab_profile', None)
            return p.license_number if p else None
        return None

    def get_address(self, obj):
        if obj.role == User.Role.PHARMACY:
            p = getattr(obj, 'pharmacy_profile', None)
            return p.address if p else None
        if obj.role == User.Role.LAB:
            p = getattr(obj, 'lab_profile', None)
            return p.address if p else None
        if obj.role == User.Role.PATIENT:
            p = getattr(obj, 'patient_profile', None)
            return p.address if p else None
        return None

    def get_age(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.age if p else None

    def get_gender(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.gender if p else None

    def get_date_of_birth(self, obj):
        if obj.role == User.Role.PATIENT:
            p = getattr(obj, 'patient_profile', None)
            return p.date_of_birth if p else None
        if obj.role == User.Role.DOCTOR:
            p = getattr(obj, 'doctor_profile', None)
            return p.date_of_birth if p else None
        return None

    def get_blood_type(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.blood_type if p else None

    def get_height_cm(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.height_cm if p else None

    def get_weight_kg(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.weight_kg if p else None

    def get_allergies(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.allergies if p else None

    def get_chronic_diseases(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.chronic_diseases if p else None

    def get_past_diseases(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.past_diseases if p else None

    def get_family_history(self, obj):
        p = getattr(obj, 'patient_profile', None)
        return p.family_history if p else None

    def get_hospital_name(self, obj):
        p = getattr(obj, 'doctor_profile', None)
        return p.hospital_name if p else None

    def get_experience_years(self, obj):
        p = getattr(obj, 'doctor_profile', None)
        return p.experience_years if p else None

    def get_about(self, obj):
        p = getattr(obj, 'doctor_profile', None)
        return p.about if p else None

    def get_must_change_password(self, obj):
        return bool(getattr(obj, "force_password_change", False))

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        # Default role is PATIENT
        validated_data['role'] = User.Role.PATIENT
        user = User.objects.create_user(**validated_data)
        return user

class CreateStaffSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.ChoiceField(choices=User.Role.choices)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class AdminUserUpdateSerializer(serializers.ModelSerializer):
    specialization = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    phone = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active',
                  'specialization', 'phone', 'license_number', 'address', 'age', 'gender']

    @transaction.atomic
    def update(self, instance, validated_data):
        for field in ['username', 'email', 'first_name', 'last_name', 'is_active']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        role = instance.role
        if role == User.Role.DOCTOR:
            profile, _ = DoctorProfile.objects.get_or_create(user=instance)
            if 'specialization' in validated_data:
                profile.specialization = validated_data.get('specialization')
            if 'phone' in validated_data:
                profile.phone = validated_data.get('phone')
            profile.save()
        elif role == User.Role.PHARMACY:
            profile, _ = PharmacyProfile.objects.get_or_create(user=instance)
            if 'license_number' in validated_data:
                profile.license_number = validated_data.get('license_number')
            if 'phone' in validated_data:
                profile.phone = validated_data.get('phone')
            if 'address' in validated_data:
                profile.address = validated_data.get('address')
            profile.save()
        elif role == User.Role.LAB:
            profile, _ = LabProfile.objects.get_or_create(user=instance)
            if 'license_number' in validated_data:
                profile.license_number = validated_data.get('license_number')
            if 'phone' in validated_data:
                profile.phone = validated_data.get('phone')
            if 'address' in validated_data:
                profile.address = validated_data.get('address')
            profile.save()
        elif role == User.Role.PATIENT:
            profile, _ = PatientProfile.objects.get_or_create(user=instance)
            if 'age' in validated_data:
                profile.age = validated_data.get('age')
            if 'gender' in validated_data:
                profile.gender = validated_data.get('gender')
            if 'phone' in validated_data:
                profile.phone = validated_data.get('phone')
            if 'address' in validated_data:
                profile.address = validated_data.get('address')
            profile.save()

        return instance

class PatientProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    blood_type = serializers.CharField(required=False, allow_blank=True)
    height_cm = serializers.IntegerField(required=False, allow_null=True)
    weight_kg = serializers.FloatField(required=False, allow_null=True)
    allergies = serializers.CharField(required=False, allow_blank=True)
    chronic_diseases = serializers.CharField(required=False, allow_blank=True)
    past_diseases = serializers.CharField(required=False, allow_blank=True)
    family_history = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        for f in ['first_name', 'last_name', 'email']:
            if f in validated_data:
                setattr(instance, f, validated_data[f])
        instance.save()

        profile, _ = PatientProfile.objects.get_or_create(user=instance)
        for f in ['phone', 'address', 'age', 'gender', 'date_of_birth', 'blood_type',
                  'height_cm', 'weight_kg', 'allergies', 'chronic_diseases',
                  'past_diseases', 'family_history']:
            if f in validated_data:
                setattr(profile, f, validated_data[f])
        profile.save()
        return instance

class DoctorProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    hospital_name = serializers.CharField(required=False, allow_blank=True)
    experience_years = serializers.IntegerField(required=False, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    about = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        for f in ['first_name', 'last_name', 'email']:
            if f in validated_data:
                setattr(instance, f, validated_data[f])
        instance.save()

        profile, _ = DoctorProfile.objects.get_or_create(user=instance)
        for f in ['phone', 'specialization', 'license_number', 'hospital_name', 'experience_years', 'date_of_birth', 'about']:
            if f in validated_data:
                setattr(profile, f, validated_data[f])
        profile.save()
        return instance

class PharmacyProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        for f in ['first_name', 'last_name', 'email']:
            if f in validated_data:
                setattr(instance, f, validated_data[f])
        instance.save()
        profile, _ = PharmacyProfile.objects.get_or_create(user=instance)
        for f in ['phone', 'license_number', 'address']:
            if f in validated_data:
                setattr(profile, f, validated_data[f])
        profile.save()
        return instance

class LabProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        for f in ['first_name', 'last_name', 'email']:
            if f in validated_data:
                setattr(instance, f, validated_data[f])
        instance.save()
        profile, _ = LabProfile.objects.get_or_create(user=instance)
        for f in ['phone', 'license_number', 'address']:
            if f in validated_data:
                setattr(profile, f, validated_data[f])
        profile.save()
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "data", "is_read", "created_at", "sender_name", "sender_avatar"]
    def get_sender_name(self, obj):
        u = getattr(obj, "sender", None)
        if not u:
            return None
        full = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
        return full or u.username
    def get_sender_avatar(self, obj):
        u = getattr(obj, "sender", None)
        f = getattr(u, "avatar", None) if u else None
        try:
            return f.url if f else None
        except Exception:
            return None
