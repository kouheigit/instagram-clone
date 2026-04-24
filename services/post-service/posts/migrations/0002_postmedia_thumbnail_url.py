from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="postmedia",
            name="thumbnail_url",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
