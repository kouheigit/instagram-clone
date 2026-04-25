from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("posts", "0003_postmedia_hls_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="view_count",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
