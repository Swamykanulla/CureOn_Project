from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("pharmacy", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Transaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("trx_code", models.CharField(blank=True, max_length=20, unique=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("type", models.CharField(choices=[("SALE", "Sale"), ("RESTOCK", "Restock"), ("ADJUSTMENT", "Adjustment")], max_length=12)),
                ("details", models.CharField(blank=True, max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("status", models.CharField(choices=[("COMPLETED", "Completed"), ("APPROVED", "Approved"), ("PENDING", "Pending")], default="COMPLETED", max_length=12)),
                ("quantity", models.IntegerField(default=0)),
                ("applied", models.BooleanField(default=False)),
                ("item", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="transactions", to="pharmacy.inventoryitem")),
                ("user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pharmacy_transactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]

