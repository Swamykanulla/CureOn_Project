from django.db import models
from django.conf import settings


class DoctorAvailability(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="availability"
    )
    weekday = models.IntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        unique_together = ("doctor", "weekday", "start_time", "end_time")
        ordering = ["doctor_id", "weekday", "start_time"]

    def __str__(self):
        return f"{self.doctor_id} {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        RESCHEDULE_REQUESTED = "RESCHEDULE_REQUESTED", "RescheduleRequested"

    class VisitType(models.TextChoices):
        VIDEO_CALL = "VIDEO_CALL", "Video Call"
        IN_PERSON = "IN_PERSON", "In-Person"

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_appointments"
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_appointments"
    )
    date = models.DateField()
    time_slot = models.TimeField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.UPCOMING)
    visit_type = models.CharField(max_length=20, choices=VisitType.choices, default=VisitType.VIDEO_CALL)
    video_url = models.URLField(max_length=500, null=True, blank=True)
    is_paid = models.BooleanField(default=False)

    requested_date = models.DateField(null=True, blank=True)
    requested_time_slot = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("doctor", "date", "time_slot")
        ordering = ["-date", "time_slot"]

    def __str__(self):
        return f"{self.patient_id} -> {self.doctor_id} @ {self.date} {self.time_slot} [{self.status}]"

class Prescription(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"

    class PharmacyStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="prescription")
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="prescriptions")
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="written_prescriptions")
    pharmacy = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="processed_prescriptions", null=True, blank=True)
    diagnosis = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    pharmacy_status = models.CharField(max_length=20, choices=PharmacyStatus.choices, default=PharmacyStatus.PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bill_attachment = models.FileField(upload_to="bills/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    quantity = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

class LabTestRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"
    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Routine"
        URGENT = "URGENT", "Urgent"
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="lab_requests")
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_requests")
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ordered_lab_tests")
    lab = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="incoming_lab_requests", null=True, blank=True)
    tests = models.JSONField()  # list of test names
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.ROUTINE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    result_value = models.CharField(max_length=255, blank=True)
    reference_range = models.CharField(max_length=255, blank=True)
    clinical_notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to="lab_results/", null=True, blank=True)
    class Meta:
        ordering = ["-created_at"]


class LabTestRecord(models.Model):
    class ResultSummary(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        ABNORMAL = "ABNORMAL", "Abnormal"
        INFECTION_DETECTED = "INFECTION_DETECTED", "Infection Detected"

    request = models.OneToOneField(
        LabTestRequest, on_delete=models.CASCADE, related_name="record"
    )
    test_id = models.CharField(max_length=20, unique=True)
    date = models.DateField()
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_history"
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_history_as_doctor"
    )
    lab = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_history_as_lab"
    )
    test_type = models.CharField(max_length=255)
    result_summary = models.CharField(
        max_length=32, choices=ResultSummary.choices, default=ResultSummary.NORMAL
    )
    result_details = models.TextField(blank=True)
    attachment = models.FileField(upload_to="lab_history/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.test_id} - {self.test_type} ({self.get_result_summary_display()})"
