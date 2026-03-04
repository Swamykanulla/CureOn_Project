from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_id",
        "user",
        "appointment",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("transaction_id", "user__username", "appointment__id")
    readonly_fields = ("created_at", "updated_at")

