from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_alter_sitedesign_active_design"),
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
                    ("uzbek_silk", "Milliy atlas"),
                ],
                default="original",
                max_length=30,
                verbose_name="Faol dizayn",
            ),
        ),
    ]
