from pathlib import Path
import shutil

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Load Saxovat menu content and its public images; does not create users."

    def handle(self, *args, **options):
        source = Path(settings.BASE_DIR) / "seed-media"
        target = Path(settings.MEDIA_ROOT)
        for image in source.rglob("*"):
            if image.is_file():
                destination = target / image.relative_to(source)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(image, destination)
        call_command("loaddata", str(Path(settings.BASE_DIR) / "fixtures" / "restaurant.json"))
        self.stdout.write(self.style.SUCCESS("Saxovat menu and images loaded. No user accounts created."))
