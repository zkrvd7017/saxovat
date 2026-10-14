from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import Mock

from django.test import TestCase

from .models import TelegramGuest, UserProfile
from .telegram_bot import SaxovatBot, load_config


class SaxovatBotTests(TestCase):
    def setUp(self):
        self.client = Mock()
        self.bot = SaxovatBot(self.client, "https://saxovat.easymenu.uz/")
        self.update = {"update_id": 1, "message": {
            "chat": {"id": 123, "type": "private"},
            "from": {"id": 123, "first_name": "<Diyor>", "username": "guest"},
            "text": "/start",
        }}

    def test_start_registers_once_and_does_not_create_login_account(self):
        self.bot.handle(self.update)
        self.bot.handle(self.update)
        self.assertEqual(TelegramGuest.objects.count(), 1)
        self.assertEqual(UserProfile.objects.count(), 0)
        payload = self.client.call.call_args.kwargs
        self.assertIn("&lt;Diyor&gt;", payload["text"])
        self.assertIn("Saxovat restoranimizga xush kelibsiz", payload["text"])
        self.assertEqual(payload["reply_markup"]["inline_keyboard"][0][0]["web_app"]["url"], "https://saxovat.easymenu.uz/")

    def test_group_messages_are_ignored(self):
        self.update["message"]["chat"]["type"] = "group"
        self.bot.handle(self.update)
        self.client.call.assert_not_called()
        self.assertEqual(TelegramGuest.objects.count(), 0)

    def test_contact_and_menu_commands(self):
        for command, expected in [("/aloqa", "+998 97 353-00-00"), ("/menu", "Saxovat menyusi")]:
            self.update["message"]["text"] = command
            self.bot.handle(self.update)
            self.assertIn(expected, self.client.call.call_args.kwargs["text"])

    def test_local_menu_url_is_rejected(self):
        with TemporaryDirectory() as directory:
            config = Path(directory) / ".env.bot"
            config.write_text("TELEGRAM_BOT_TOKEN=123:example\nSAXOVAT_MENU_URL=https://127.0.0.1/", encoding="utf-8")
            with self.assertRaises(ValueError):
                load_config(config)
