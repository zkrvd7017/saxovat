from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_story"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteDesign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("active_design", models.CharField(choices=[("pink_silk", "Pushti ipak"), ("burgundy_silk", "Bordo ipak")], default="pink_silk", max_length=30, verbose_name="Faol dizayn")),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Sayt dizayni",
                "verbose_name_plural": "Sayt dizayni",
            },
        ),
    ]
