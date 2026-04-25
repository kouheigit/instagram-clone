from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("media_app", "0002_mediafile_thumbnail_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="mediafile",
            name="hls_url",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
