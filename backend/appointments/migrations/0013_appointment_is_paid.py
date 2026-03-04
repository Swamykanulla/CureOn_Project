from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0012_appointment_video_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="is_paid",
            field=models.BooleanField(default=False),
        ),
    ]

