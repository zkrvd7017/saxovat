"""
Candy Land — Role-Based Permission Classes
============================================
IsCustomer   : Allows access only to users with CUSTOMER role.
IsCashier    : Allows access to CASHIER and SUPER_ADMIN (cashiers can use all cashier features).
IsSuperAdmin : Allows access only to SUPER_ADMIN role.
"""

from rest_framework.permissions import BasePermission


class IsCustomer(BasePermission):
    """Allow access only to authenticated CUSTOMER users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "CUSTOMER"
        )


class IsCashier(BasePermission):
    """Allow access to CASHIER and SUPER_ADMIN users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("CASHIER", "SUPER_ADMIN")
        )


class IsSuperAdmin(BasePermission):
    """Allow access only to SUPER_ADMIN users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "SUPER_ADMIN"
        )
