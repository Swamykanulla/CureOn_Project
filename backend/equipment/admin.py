from django.contrib import admin
from .models import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ("asset_id", "name", "model", "location", "status", "next_maintenance")
    list_filter = ("status", "location")
    search_fields = ("asset_id", "name", "model")
