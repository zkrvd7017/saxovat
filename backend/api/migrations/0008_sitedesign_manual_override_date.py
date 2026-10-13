from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_alter_sitedesign_active_design"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitedesign",
            name="manual_override_date",
            field=models.DateField(blank=True, null=True, verbose_name="Qo‘lda almashtirilgan sana"),
        ),
    ]
