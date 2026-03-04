from django.contrib import admin
from .models import Appointment, DoctorAvailability


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "doctor", "date", "time_slot", "status")
    list_filter = ("status", "doctor", "date")
    search_fields = ("patient__username", "doctor__username")
    ordering = ("-date", "time_slot")


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ("id", "doctor", "weekday", "start_time", "end_time")
    list_filter = ("doctor", "weekday")
    search_fields = ("doctor__username",)
    ordering = ("doctor", "weekday", "start_time")
