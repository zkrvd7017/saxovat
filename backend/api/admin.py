"""
Candy Land — Django Admin Registration
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserProfile, CustomerData, Transaction, MenuItem, ShopLocation, SiteDesign, TelegramGuest


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    list_display = ("phone_number", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("phone_number", "first_name", "last_name")
    ordering = ("-date_joined",)

    # Add role and phone_number to the admin form
    fieldsets = UserAdmin.fieldsets + (
        ("Candy Land", {"fields": ("role", "phone_number")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Candy Land", {"fields": ("role", "phone_number")}),
    )


@admin.register(CustomerData)
class CustomerDataAdmin(admin.ModelAdmin):
    list_display = ("user", "virtual_card_number", "cashback_balance")
    search_fields = ("user__phone_number", "virtual_card_number")
    readonly_fields = ("qr_code_hash",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("customer", "cashier", "transaction_type", "bill_amount", "cashback_amount", "timestamp")
    list_filter = ("transaction_type", "timestamp")
    date_hierarchy = "timestamp"


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price", "is_new")
    list_filter = ("category", "is_new")
    search_fields = ("title",)

@admin.register(ShopLocation)
class ShopLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "address", "working_hours")
    search_fields = ("name", "address")


@admin.register(SiteDesign)
class SiteDesignAdmin(admin.ModelAdmin):
    list_display = ("active_design", "manual_override_date", "updated_at")


@admin.register(TelegramGuest)
class TelegramGuestAdmin(admin.ModelAdmin):
    list_display = ("first_name", "username", "telegram_id", "joined_at", "last_seen_at")
    search_fields = ("first_name", "username", "telegram_id")
    readonly_fields = ("telegram_id", "first_name", "last_name", "username", "joined_at", "last_seen_at")

    def has_add_permission(self, request):
        return False
