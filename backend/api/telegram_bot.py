"""Saxovat's private-chat welcome bot; secrets are supplied outside source control."""

import json
import os
import re
from html import escape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from django.utils import timezone

from .models import TelegramGuest

MENU_URL = "https://saxovat.easymenu.uz/"
PHONE = "+998 97 353-00-00"


def load_config(path):
    values = {}
    path = Path(path)
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("\"'")
    token = os.environ.get("TELEGRAM_BOT_TOKEN", values.get("TELEGRAM_BOT_TOKEN", ""))
    menu_url = os.environ.get("SAXOVAT_MENU_URL", values.get("SAXOVAT_MENU_URL", MENU_URL))
    if not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", token):
        raise ValueError("TELEGRAM_BOT_TOKEN sozlanmagan yoki noto‘g‘ri.")
    parsed = urlparse(menu_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("SAXOVAT_MENU_URL internetdagi HTTPS menyu havolasi bo‘lishi kerak.")
    if parsed.hostname in ("localhost", "127.0.0.1", "::1"):
        raise ValueError("Local menyu havolasi Telegram mehmonlarida ochilmaydi.")
    return token, menu_url


class TelegramError(Exception):
    def __init__(self, code, retry_after=5):
        self.code = code
        self.retry_after = min(max(int(retry_after), 1), 60)
        # Do not include HTTP exceptions or request URLs: these contain the token.
        super().__init__(f"Telegram API xatoligi ({code})")


class TelegramClient:
    def __init__(self, token):
        self._base_url = f"https://api.telegram.org/bot{token}/"

    def call(self, method, **payload):
        request = Request(
            self._base_url + method,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=40) as response:
                result = json.load(response)
        except HTTPError as error:
            try:
                result = json.load(error)
            except (ValueError, OSError):
                raise TelegramError(error.code) from None
        except (URLError, TimeoutError, OSError):
            raise TelegramError(0) from None
        if not result.get("ok"):
            raise TelegramError(result.get("error_code", 0), result.get("parameters", {}).get("retry_after", 5))
        return result["result"]


class SaxovatBot:
    def __init__(self, client, menu_url):
        self.client = client
        self.menu_url = menu_url

    def keyboard(self):
        return {"inline_keyboard": [[{
            "text": "🍽 Menyuni ko‘rish",
            "web_app": {"url": self.menu_url},
        }]]}

    def handle(self, update):
        message = update.get("message", {})
        user = message.get("from", {})
        text = message.get("text", "")
        if message.get("chat", {}).get("type") != "private" or not user.get("id") or user.get("is_bot") or not text.strip():
            return
        TelegramGuest.objects.update_or_create(
            telegram_id=user["id"],
            defaults={
                "first_name": user.get("first_name", "")[:255],
                "last_name": user.get("last_name", "")[:255],
                "username": user.get("username", "")[:255],
                "last_seen_at": timezone.now(),
            },
        )
        command = text.split()[0].split("@")[0].lower()
        if command == "/start":
            name = escape(user.get("first_name", "").strip())
            greeting = f"Assalomu alaykum, {name}! 🌿" if name else "Assalomu alaykum! 🌿"
            reply = (
                f"{greeting}\n\n"
                "<b>Saxovat restoranimizga xush kelibsiz!</b>\n\n"
                "Mazali taomlar, samimiy xizmat va fayzli dasturxon — siz uchun. "
                "Tashrifingizdan doimo mamnunmiz! 🤍\n\n"
                "Taomlar va narxlar bilan tanishish uchun quyidagi tugmani bosing.\n\n"
                f"📞 Yetkazib berish va aloqa: <b>{PHONE}</b>\n"
                "Yoqimli ishtaha!"
            )
        elif command == "/aloqa":
            reply = f"📞 <b>Saxovat — yetkazib berish va aloqa</b>\n\n{PHONE}\n\nSizga xizmat qilishdan mamnunmiz!"
        else:
            reply = "🍽 <b>Saxovat menyusi</b>\n\nSevimli taomingizni tanlang. Menyuni ochish uchun quyidagi tugmani bosing."
        self.client.call(
            "sendMessage", chat_id=message["chat"]["id"], text=reply,
            parse_mode="HTML", reply_markup=self.keyboard(),
        )
