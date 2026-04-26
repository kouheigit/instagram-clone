from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="website",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="user",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[
                    ("male", "男性"),
                    ("female", "女性"),
                    ("custom", "カスタム"),
                    ("prefer_not", "回答しない"),
                ],
                default="male",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="show_account_suggestions",
            field=models.BooleanField(default=True),
        ),
    ]
