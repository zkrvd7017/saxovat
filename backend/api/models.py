"""
Candy Land — Database Models
=============================
UserProfile  : Custom user with role-based access (CUSTOMER / CASHIER / SUPER_ADMIN)
CustomerData : One-to-one loyalty card data for each customer
Transaction  : Cashback earn / redeem history
MenuItem     : Table QR menu catalog
"""

import uuid
import random
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserProfile(AbstractUser):
    """
    Extends Django's AbstractUser with a role field and phone_number login.
    The `username` field is kept (required by AbstractUser) but auto-set to
    the phone_number value so that phone_number is the de-facto login identifier.
    """

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Mijoz"
        CASHIER = "CASHIER", "Hodim"
        SUPER_ADMIN = "SUPER_ADMIN", "Katta Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        verbose_name="Rol",
    )
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Telefon raqam",
        help_text="Masalan: +998901112420",
    )

    # We still need `username` for Django internals — it's auto-populated from phone.
    REQUIRED_FIELDS = ["phone_number"]

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    def __str__(self):
        return f"{self.get_full_name() or self.phone_number} ({self.get_role_display()})"


def _generate_card_number() -> str:
    """Generate a unique 16-digit virtual card number."""
    return "".join([str(random.randint(0, 9)) for _ in range(16)])


def _generate_qr_hash() -> str:
    """Generate a unique QR code hash string."""
    return uuid.uuid4().hex


class CustomerData(models.Model):
    """
    Loyalty card data attached 1-to-1 to a CUSTOMER UserProfile.
    """

    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="customer_data",
        verbose_name="Foydalanuvchi",
    )
    virtual_card_number = models.CharField(
        max_length=16,
        unique=True,
        default=_generate_card_number,
        verbose_name="Virtual karta raqami",
    )
    cashback_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Cashback balansi",
    )
    qr_code_hash = models.CharField(
        max_length=64,
        unique=True,
        default=_generate_qr_hash,
        verbose_name="QR kod hash",
    )

    class Meta:
        verbose_name = "Mijoz ma'lumotlari"
        verbose_name_plural = "Mijozlar ma'lumotlari"

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.formatted_card}"

    @property
    def formatted_card(self) -> str:
        """Return card number as '1234 5678 9012 3456'."""
        n = self.virtual_card_number
        return f"{n[0:4]} {n[4:8]} {n[8:12]} {n[12:16]}"


class Transaction(models.Model):
    """
    Records every cashback earn or redeem operation.
    """

    class Type(models.TextChoices):
        EARN = "EARN", "Cashback berildi"
        REDEEM = "REDEEM", "Balansdan yechildi"

    customer = models.ForeignKey(
        CustomerData,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="Mijoz",
    )
    cashier = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="processed_transactions",
        verbose_name="Kassir",
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=Type.choices,
        verbose_name="Turi",
    )
    bill_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Hisob summasi",
    )
    cashback_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Cashback summasi",
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Vaqt",
    )

    class Meta:
        verbose_name = "Tranzaksiya"
        verbose_name_plural = "Tranzaksiyalar"
        ordering = ["-timestamp"]

    def __str__(self):
        return (
            f"{self.get_transaction_type_display()} — "
            f"{self.cashback_amount} so'm ({self.customer.user.get_full_name()})"
        )


class MenuCategory(models.Model):
    """
    Dynamic menu categories manageable from the admin panel.
    """
    name = models.CharField(max_length=100, unique=True, verbose_name="Kategoriya nomi")
    image_url = models.CharField(max_length=500, blank=True, verbose_name="Rasm URL")
    order = models.PositiveIntegerField(default=0, verbose_name="Tartib raqami")

    class Meta:
        verbose_name = "Menyu kategoriyasi"
        verbose_name_plural = "Menyu kategoriyalari"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class MenuBanner(models.Model):
    """
    Single banner image shown at the top of the public menu page.
    Only one active banner is shown at a time.
    """
    image_url = models.CharField(max_length=500, verbose_name="Banner rasm URL")
    is_active = models.BooleanField(default=True, verbose_name="Faol")

    class Meta:
        verbose_name = "Menyu banneri"
        verbose_name_plural = "Menyu bannerlari"

    def __str__(self):
        return f"Banner {'(faol)' if self.is_active else '(nofaol)'}"


class SiteDesign(models.Model):
    """The customer-facing design selected by a super admin."""

    class Design(models.TextChoices):
        ORIGINAL = "original", "Asl dizayn"
        PINK_SILK = "pink_silk", "Pushti ipak"
        BURGUNDY_SILK = "burgundy_silk", "Bordo ipak"
        UZBEK_SILK = "uzbek_silk", "Milliy atlas"

    active_design = models.CharField(
        max_length=30,
        choices=Design.choices,
        default=Design.ORIGINAL,
        verbose_name="Faol dizayn",
    )
    manual_override_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Qo‘lda almashtirilgan sana",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sayt dizayni"
        verbose_name_plural = "Sayt dizayni"

    def __str__(self):
        return self.get_active_design_display()


class MenuItem(models.Model):
    """
    Menu item for the table QR menu.
    """
    title = models.CharField(max_length=200, verbose_name="Nomi")
    category = models.CharField(
        max_length=100,
        verbose_name="Kategoriya",
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Narxi (UZS)",
    )
    image_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name="Rasm URL",
    )
    prep_time = models.PositiveIntegerField(
        default=15,
        verbose_name="Tayyorlanish vaqti (min)",
    )
    is_new = models.BooleanField(
        default=False,
        verbose_name="Yangi",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Tavsif",
    )

    class Meta:
        verbose_name = "Menyu elementi"
        verbose_name_plural = "Menyu elementlari"

    def __str__(self):
        return f"{self.title} — {self.price} so'm"


class ShopLocation(models.Model):
    """
    Physical store locations manageable from Django admin.
    """
    name = models.CharField(max_length=150, verbose_name="Do'kon nomi")
    address = models.CharField(max_length=255, verbose_name="Manzil")
    working_hours = models.CharField(max_length=100, default="08:00 - 22:00", verbose_name="Ish vaqti")
    map_link = models.URLField(max_length=500, blank=True, verbose_name="Xarita havolasi")
    image_url = models.CharField(max_length=500, blank=True, verbose_name="Rasm URL")

    class Meta:
        verbose_name = "Do'kon"
        verbose_name_plural = "Do'konlar"

    def __str__(self):
        return self.name

class Story(models.Model):
    """
    Instagram-like stories for the customer dashboard.
    """
    title = models.CharField(max_length=50, verbose_name="Mavzu")
    image_url = models.CharField(max_length=500, verbose_name="Rasm URL")
    is_active = models.BooleanField(default=True, verbose_name="Faol")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")

    class Meta:
        verbose_name = "Istoriya"
        verbose_name_plural = "Istoriyalar"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class TelegramGuest(models.Model):
    telegram_id = models.BigIntegerField(unique=True)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    username = models.CharField(max_length=255, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField()

    class Meta:
        verbose_name = "Telegram mehmoni"
        verbose_name_plural = "Telegram mehmonlari"
        ordering = ["-joined_at"]

    def __str__(self):
        return self.first_name or str(self.telegram_id)


class TelegramBotCursor(models.Model):
    bot_id = models.BigIntegerField(primary_key=True)
    last_update_id = models.BigIntegerField(default=-1)
