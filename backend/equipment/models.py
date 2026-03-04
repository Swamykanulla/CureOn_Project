from django.db import models
from django.conf import settings


class Equipment(models.Model):
    lab = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="equipments",
    )
    class Status(models.TextChoices):
        OPERATIONAL = "OPERATIONAL", "Operational"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        CALIBRATING = "CALIBRATING", "Calibrating"
        REPORTED = "REPORTED", "Reported"
        BROKEN = "BROKEN", "Broken"

    asset_id = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    model = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPERATIONAL
    )
    last_maintenance = models.DateField(null=True, blank=True)
    next_maintenance = models.DateField(null=True, blank=True)

    issue_type = models.CharField(max_length=255, blank=True)
    issue_description = models.TextField(blank=True)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reported_equipment_issues"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["lab", "asset_id"], name="unique_asset_per_lab"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.asset_id} - {self.name}"
