from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_sitedesign"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitedesign",
            name="active_design",
            field=models.CharField(
                choices=[
                    ("original", "Asl dizayn"),
                    ("pink_silk", "Pushti ipak"),
                    ("burgundy_silk", "Bordo ipak"),
                ],
                default="original",
                max_length=30,
                verbose_name="Faol dizayn",
            ),
        ),
    ]
