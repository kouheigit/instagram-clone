from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("search", "0003_backfill_user_profile_img"),
    ]

    operations = [
        migrations.AddField(
            model_name="userindex",
            name="website",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
