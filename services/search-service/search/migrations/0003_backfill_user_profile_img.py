from django.db import migrations


def backfill_user_profile_images(apps, schema_editor):
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        tables = set(connection.introspection.table_names(cursor))
        if "users" not in tables or "search_users" not in tables:
            return

        cursor.execute(
            """
            UPDATE search_users AS su
            SET profile_img = COALESCE(u.profile_img, '')
            FROM users AS u
            WHERE u.user_id = su.user_id
              AND COALESCE(u.profile_img, '') <> COALESCE(su.profile_img, '')
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ("search", "0002_userindex_name_email"),
    ]

    operations = [
        migrations.RunPython(backfill_user_profile_images, migrations.RunPython.noop),
    ]
