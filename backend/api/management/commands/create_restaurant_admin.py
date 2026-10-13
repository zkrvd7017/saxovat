from getpass import getpass
import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create a restaurant administrator with an interactively entered password."

    def add_arguments(self, parser):
        parser.add_argument("--phone", required=True)
        parser.add_argument("--name", default="Admin")

    def handle(self, *args, **options):
        phone = re.sub(r"\s+", "", options["phone"])
        if not re.fullmatch(r"\+998\d{9}", phone):
            raise CommandError("Use a full Uzbek phone number: +998 and nine digits.")
        users = get_user_model()
        if users.objects.filter(phone_number=phone).exists():
            raise CommandError("This phone number already has an account.")
        password = getpass("Admin password: ")
        if password != getpass("Repeat password: "):
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password)
        except ValidationError as error:
            raise CommandError(" ".join(error.messages)) from error
        users.objects.create_user(
            username=phone,
            phone_number=phone,
            first_name=options["name"],
            password=password,
            role=users.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        self.stdout.write(self.style.SUCCESS("Restaurant administrator created."))
