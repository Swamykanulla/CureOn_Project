from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pharmacy", "0002_transaction"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="inventoryitem",
            constraint=models.UniqueConstraint(
                fields=("created_by", "name"),
                name="unique_item_per_pharmacy",
            ),
        ),
    ]

