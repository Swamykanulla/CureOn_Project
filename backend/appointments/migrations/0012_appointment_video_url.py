from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0011_labtestrecord"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="video_url",
            field=models.URLField(max_length=500, null=True, blank=True),
        ),
    ]

