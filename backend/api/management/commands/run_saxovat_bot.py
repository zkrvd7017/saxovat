import os
import time
from contextlib import contextmanager
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.models import TelegramBotCursor
from api.telegram_bot import SaxovatBot, TelegramClient, TelegramError, load_config


@contextmanager
def single_worker(path):
    """OS releases this lock even if the bot process exits unexpectedly."""
    with open(path, "a+b") as lock:
        lock.seek(0)
        lock.write(b"0")
        lock.flush()
        lock.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise CommandError("Bot allaqachon shu sozlama bilan ishlayapti.") from None
        yield


class Command(BaseCommand):
    help = "Run the Saxovat Telegram welcome and menu bot."

    def add_arguments(self, parser):
        parser.add_argument("--config", default=str(settings.BASE_DIR / ".env.bot"))

    def handle(self, *args, **options):
        config_path = Path(options["config"])
        try:
            token, menu_url = load_config(config_path)
        except ValueError as error:
            raise CommandError(str(error)) from None
        client = TelegramClient(token)
        try:
            with single_worker(config_path.with_suffix(".lock")):
                info = client.call("getMe")
                if client.call("getWebhookInfo").get("url"):
                    raise CommandError("Botda webhook faol. Polling uchun mavjud xizmat sozlamasini tekshiring.")
                client.call("setMyName", name="Saxovat Restoran")
                client.call("setMyDescription", description="Saxovat restoraniga xush kelibsiz! 🌿 Taomlar va narxlarni ko‘ring. Yetkazib berish va aloqa: +998 97 353-00-00. Boshlash uchun /start bosing.")
                client.call("setMyShortDescription", short_description="Saxovat — mazali taomlar va samimiy xizmat. 🍽 Aloqa: +998 97 353-00-00")
                client.call("setMyCommands", commands=[
                    {"command": "start", "description": "Xush kelibsiz"},
                    {"command": "menu", "description": "Restoran menyusini ochish"},
                    {"command": "aloqa", "description": "Yetkazib berish va telefon"},
                ])
                cursor, _ = TelegramBotCursor.objects.get_or_create(bot_id=info["id"])
                bot = SaxovatBot(client, menu_url)
                self.stdout.write(f"Saxovat bot ishga tushdi: @{info['username']} | Menyu: {menu_url}")
                self.stdout.flush()
                while True:
                    try:
                        updates = client.call("getUpdates", offset=cursor.last_update_id + 1, timeout=25, allowed_updates=["message"])
                        for update in updates:
                            try:
                                bot.handle(update)
                            except TelegramError as error:
                                if error.code != 403:
                                    raise
                                # A blocked bot cannot reply; do not block other guests' updates.
                            cursor.last_update_id = update["update_id"]
                            cursor.save(update_fields=["last_update_id"])
                    except TelegramError as error:
                        if error.code in (401, 409):
                            raise CommandError("Token yaroqsiz yoki boshqa bot jarayoni polling ishlatyapti.") from None
                        self.stderr.write(str(error))
                        self.stderr.flush()
                        time.sleep(error.retry_after)
        except TelegramError as error:
            raise CommandError(str(error)) from None
        except KeyboardInterrupt:
            self.stdout.write("Bot to‘xtatildi.")
