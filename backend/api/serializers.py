"""
Candy Land — DRF Serializers
==============================
Handles validation, representation, and creation logic for all API payloads.
"""

from decimal import Decimal
from django.utils.timezone import now
from django.db.models import Sum
from rest_framework import serializers
from .models import UserProfile, CustomerData, Transaction, MenuItem, ShopLocation, MenuCategory, MenuBanner, Story


# ──────────────────── Auth ────────────────────


class PhoneCheckSerializer(serializers.Serializer):
    """Validates phone number format for checking existence and role."""
    phone_number = serializers.CharField(max_length=20)

class CustomerRegisterSerializer(serializers.Serializer):
    """Validates phone, name, and 4-digit PIN for new customers."""
    phone_number = serializers.CharField(max_length=20)
    first_name = serializers.CharField(max_length=150)
    pin = serializers.CharField(max_length=4, min_length=4)

class CustomerLoginSerializer(serializers.Serializer):
    """Validates customer phone + PIN login."""

    phone_number = serializers.CharField(max_length=20)
    pin = serializers.CharField(max_length=4)


class StaffLoginSerializer(serializers.Serializer):
    """Validates staff (Cashier/Admin) phone + password login."""

    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True)


# ──────────────────── Customer ────────────────────


class CustomerDataSerializer(serializers.ModelSerializer):
    """Serializes the loyalty card information."""

    formatted_card = serializers.CharField(read_only=True)

    class Meta:
        model = CustomerData
        fields = [
            "id",
            "virtual_card_number",
            "formatted_card",
            "cashback_balance",
            "qr_code_hash",
        ]


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Full customer profile including nested loyalty card data."""

    customer_data = CustomerDataSerializer(read_only=True)
    monthly_spent = serializers.SerializerMethodField()
    quarterly_spent = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "customer_data",
            "monthly_spent",
            "quarterly_spent",
        ]

    def get_monthly_spent(self, obj):
        if not hasattr(obj, 'customer_data'):
            return "0.00"
        start_of_month = now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = Transaction.objects.filter(
            customer=obj.customer_data,
            transaction_type=Transaction.Type.EARN,
            timestamp__gte=start_of_month
        ).aggregate(total=Sum('bill_amount'))['total']
        return str(total) if total else "0.00"

    def get_quarterly_spent(self, obj):
        if not hasattr(obj, 'customer_data'):
            return "0.00"
        current_month = now().month
        quarter_start_month = ((current_month - 1) // 3) * 3 + 1
        start_of_quarter = now().replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        total = Transaction.objects.filter(
            customer=obj.customer_data,
            transaction_type=Transaction.Type.EARN,
            timestamp__gte=start_of_quarter
        ).aggregate(total=Sum('bill_amount'))['total']
        return str(total) if total else "0.00"


# ──────────────────── Transaction ────────────────────


class TransactionSerializer(serializers.ModelSerializer):
    """Read-only representation of a transaction."""

    customer_name = serializers.SerializerMethodField()
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "customer_name",
            "cashier_name",
            "transaction_type",
            "bill_amount",
            "cashback_amount",
            "timestamp",
        ]

    def get_customer_name(self, obj) -> str:
        return obj.customer.user.get_full_name() or obj.customer.user.phone_number

    def get_cashier_name(self, obj) -> str:
        if obj.cashier:
            return obj.cashier.get_full_name() or obj.cashier.phone_number
        return "—"


# ──────────────────── Menu ────────────────────


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = [
            "id",
            "title",
            "category",
            "price",
            "image_url",
            "prep_time",
            "is_new",
            "description",
        ]


class ShopLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopLocation
        fields = ["id", "name", "address", "working_hours", "map_link", "image_url"]


class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = ["id", "name", "image_url", "order"]


class MenuBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuBanner
        fields = ["id", "image_url", "is_active"]


class MenuItemCreateSerializer(serializers.Serializer):
    """Used for creating/updating menu items from the admin panel."""
    title = serializers.CharField(max_length=200)
    category = serializers.CharField(max_length=100)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    prep_time = serializers.IntegerField(min_value=0, max_value=2147483647, required=False, default=15)
    image_url = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    is_new = serializers.BooleanField(required=False, default=False)


# ──────────────────── Cashier actions ────────────────────


class ScanQRSerializer(serializers.Serializer):
    """Validates the QR hash sent by the cashier scanner."""

    qr_hash = serializers.CharField(max_length=64)


class CashierTransactionSerializer(serializers.Serializer):
    """Validates cashier earn / redeem transaction payload."""

    customer_id = serializers.IntegerField()
    bill_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    type = serializers.ChoiceField(choices=["EARN", "REDEEM"])

    def validate_bill_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Summasi 0 dan katta bo'lishi kerak.")
        return value


# ──────────────────── Admin: create employee ────────────────────


class EmployeeCreateSerializer(serializers.Serializer):
    """Validates data for creating a new CASHIER account."""

    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=4)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, default="")

    def validate_phone_number(self, value):
        if UserProfile.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam allaqachon ro'yxatdan o'tgan."
            )
        return value


# ──────────────────── Admin: stats ────────────────────


class AdminStatsSerializer(serializers.Serializer):
    """Read-only stats for the super admin dashboard."""

    total_users = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_cashback_issued = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_redeemed = serializers.DecimalField(max_digits=14, decimal_places=2)
    system_liability = serializers.DecimalField(max_digits=14, decimal_places=2)


# ──────────────────── Cashier: phone search ────────────────────


class PhoneSearchSerializer(serializers.Serializer):
    """Validates phone search by cashier."""

    phone_number = serializers.CharField(max_length=20)


class StorySerializer(serializers.ModelSerializer):
    """Serializes stories for public and admin views."""
    class Meta:
        model = Story
        fields = ["id", "title", "image_url", "is_active", "created_at"]
