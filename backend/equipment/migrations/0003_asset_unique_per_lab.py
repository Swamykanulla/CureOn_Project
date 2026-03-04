from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("equipment", "0002_add_lab_field"),
    ]

    operations = [
        migrations.AlterField(
            model_name="equipment",
            name="asset_id",
            field=models.CharField(max_length=50),
        ),
        migrations.AddConstraint(
            model_name="equipment",
            constraint=models.UniqueConstraint(
                fields=("lab", "asset_id"), name="unique_asset_per_lab"
            ),
        ),
    ]

