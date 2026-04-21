from django.contrib.postgres.indexes import GinIndex
from django.db import migrations, models


def backfill_user_index_fields(apps, schema_editor):
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        tables = set(connection.introspection.table_names(cursor))
        if "users" not in tables or "search_users" not in tables:
            return

        cursor.execute(
            """
            UPDATE search_users AS su
            SET
                name = CASE
                    WHEN COALESCE(su.name, '') = '' THEN COALESCE(su.username, '')
                    ELSE su.name
                END,
                email = COALESCE(u.email, su.email, '')
            FROM users AS u
            WHERE u.user_id = su.user_id
            """
        )


class Migration(migrations.Migration):

    dependencies = [
        ("search", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="userindex",
            name="email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="userindex",
            name="name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddIndex(
            model_name="userindex",
            index=GinIndex(fields=["name"], name="search_users_name_gin", opclasses=["gin_trgm_ops"]),
        ),
        migrations.AddIndex(
            model_name="userindex",
            index=GinIndex(fields=["email"], name="search_users_email_gin", opclasses=["gin_trgm_ops"]),
        ),
        migrations.RunPython(backfill_user_index_fields, migrations.RunPython.noop),
    ]
