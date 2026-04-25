from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0002_postmedia_thumbnail_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="postmedia",
            name="hls_url",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
