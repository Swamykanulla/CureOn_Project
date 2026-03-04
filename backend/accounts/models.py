from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "PATIENT", "Patient"
        DOCTOR = "DOCTOR", "Doctor"
        PHARMACY = "PHARMACY", "Pharmacy"
        LAB = "LAB", "Lab"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=50, choices=Role.choices, default=Role.PATIENT)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True, db_index=True)
    password_reset_used = models.BooleanField(default=False, db_index=True)
    force_password_change = models.BooleanField(default=False, db_index=True)
    password_changed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"

class PatientProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="patient_profile")
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_type = models.CharField(max_length=3, null=True, blank=True)
    height_cm = models.IntegerField(null=True, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True)
    chronic_diseases = models.TextField(null=True, blank=True)
    past_diseases = models.TextField(null=True, blank=True)
    family_history = models.TextField(null=True, blank=True)

class DoctorProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="doctor_profile")
    specialization = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    license_number = models.CharField(max_length=100, null=True, blank=True)
    hospital_name = models.CharField(max_length=255, null=True, blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    about = models.TextField(null=True, blank=True)

class PharmacyProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="pharmacy_profile")
    license_number = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)

class LabProfile(models.Model):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="lab_profile")
    license_number = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)

class Notification(models.Model):
    class Type(models.TextChoices):
        APPOINTMENT_BOOKED = "APPOINTMENT_BOOKED", "AppointmentBooked"
        APPOINTMENT_STATUS = "APPOINTMENT_STATUS", "AppointmentStatus"
        RESCHEDULE_REQUEST = "RESCHEDULE_REQUEST", "RescheduleRequest"
        PRESCRIPTION_CREATED = "PRESCRIPTION_CREATED", "PrescriptionCreated"
        PHARMACY_STATUS = "PHARMACY_STATUS", "PharmacyStatus"
        LAB_REQUEST_CREATED = "LAB_REQUEST_CREATED", "LabRequestCreated"
        LAB_STATUS = "LAB_STATUS", "LabStatus"
        LAB_RESULT_READY = "LAB_RESULT_READY", "LabResultReady"
        MESSAGE = "MESSAGE", "Message"

    recipient = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    sender = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_notifications")
    type = models.CharField(max_length=40, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    data = models.JSONField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

class EmailLog(models.Model):
    recipient = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()
    success = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    error = models.TextField(null=True, blank=True)
    related_user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="email_logs")
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

class PasswordResetLog(models.Model):
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    success = models.BooleanField(default=False)
    error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [
            models.Index(fields=["username", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]
