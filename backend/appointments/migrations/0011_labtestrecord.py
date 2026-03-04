from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0010_prescription_pharmacy"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="LabTestRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("test_id", models.CharField(max_length=20, unique=True)),
                ("date", models.DateField()),
                ("test_type", models.CharField(max_length=255)),
                (
                    "result_summary",
                    models.CharField(
                        choices=[
                            ("NORMAL", "Normal"),
                            ("ABNORMAL", "Abnormal"),
                            ("INFECTION_DETECTED", "Infection Detected"),
                        ],
                        default="NORMAL",
                        max_length=32,
                    ),
                ),
                ("result_details", models.TextField(blank=True)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="lab_history/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "doctor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="lab_history_as_doctor",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "lab",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="lab_history_as_lab",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="lab_history",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "request",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="record",
                        to="appointments.labtestrequest",
                    ),
                ),
            ],
            options={"ordering": ["-date", "-created_at"]},
        ),
    ]

