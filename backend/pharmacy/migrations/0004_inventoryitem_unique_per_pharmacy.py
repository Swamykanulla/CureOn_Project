from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pharmacy", "0003_pharmacyorder_pharmacyorderitem"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                UPDATE pharmacy_transaction
                SET item_id = NULL
                WHERE item_id IS NOT NULL
                  AND item_id NOT IN (SELECT id FROM pharmacy_inventoryitem);
            """,
            reverse_sql="",
        ),
        migrations.AddConstraint(
            model_name="inventoryitem",
            constraint=models.UniqueConstraint(
                fields=("created_by", "name"),
                name="unique_item_per_pharmacy",
            ),
        ),
    ]
