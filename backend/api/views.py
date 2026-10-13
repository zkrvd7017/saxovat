"""
Candy Land — API Views
========================
Organized by role:
  1. Auth endpoints (customer OTP login, staff password login)
  2. Customer endpoints (profile, transactions)
  3. Public endpoints (menu)
  4. Cashier endpoints (QR scan, phone search, earn/redeem)
  5. Super Admin endpoints (stats, global txns, employee CRUD)
"""

from decimal import Decimal, ROUND_HALF_UP
import os
import uuid

from django.db.models import Sum, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile, CustomerData, Transaction, MenuItem, ShopLocation, MenuCategory, MenuBanner, Story, SiteDesign
from .permissions import IsCustomer, IsCashier, IsSuperAdmin
from .serializers import (
    PhoneCheckSerializer,
    CustomerRegisterSerializer,
    CustomerLoginSerializer,
    StaffLoginSerializer,
    CustomerProfileSerializer,
    CustomerDataSerializer,
    TransactionSerializer,
    MenuItemSerializer,
    MenuItemCreateSerializer,
    MenuCategorySerializer,
    MenuBannerSerializer,
    ShopLocationSerializer,
    ScanQRSerializer,
    CashierTransactionSerializer,
    EmployeeCreateSerializer,
    AdminStatsSerializer,
    PhoneSearchSerializer,
    StorySerializer,
)


def _jwt_tokens_for_user(user: UserProfile) -> dict:
    """Generate JWT access + refresh tokens for a given user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ═══════════════════════════════════════════════════════════════
#  1. AUTH
# ═══════════════════════════════════════════════════════════════


class PhoneCheckView(APIView):
    """
    POST /api/auth/check-phone/
    Checks if any user (customer/staff) with the given phone number exists.
    Returns { exists: bool, role: string | null }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ser = PhoneCheckSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        phone = ser.validated_data["phone_number"]

        user = UserProfile.objects.filter(phone_number=phone).first()
        if user:
            return Response({"exists": True, "role": user.role}, status=status.HTTP_200_OK)
        return Response({"exists": False, "role": None}, status=status.HTTP_200_OK)


class CustomerRegisterView(APIView):
    """
    POST /api/auth/customer-register/
    Registers a new customer with a 4-digit PIN.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ser = CustomerRegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        phone = ser.validated_data["phone_number"]
        first_name = ser.validated_data["first_name"]
        pin = ser.validated_data["pin"]

        if UserProfile.objects.filter(phone_number=phone).exists():
            return Response(
                {"detail": "Bu raqam allaqachon ro'yxatdan o'tgan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = UserProfile(
            phone_number=phone,
            username=phone,
            first_name=first_name,
            role=UserProfile.Role.CUSTOMER,
        )
        user.set_password(pin)
        user.save()

        CustomerData.objects.create(user=user)

        tokens = _jwt_tokens_for_user(user)
        return Response(
            {
                "tokens": tokens,
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CustomerLoginView(APIView):
    """
    POST /api/auth/customer-login/
    Logs in a customer using their 4-digit PIN.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ser = CustomerLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        phone = ser.validated_data["phone_number"]
        pin = ser.validated_data["pin"]

        try:
            user = UserProfile.objects.get(phone_number=phone, role=UserProfile.Role.CUSTOMER)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Agar eski mijozda PIN kod umuman o'rnatilmagan bo'lsa (yangi tizimga o'tish)
        if not user.has_usable_password():
            user.set_password(pin)
            user.save()
        elif not user.check_password(pin):
            return Response(
                {"detail": "PIN kod noto'g'ri."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = _jwt_tokens_for_user(user)
        return Response(
            {
                "tokens": tokens,
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


class StaffLoginView(APIView):
    """
    POST /api/auth/staff-login/
    Payload: { phone_number, password }
    For CASHIER and SUPER_ADMIN roles.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        ser = StaffLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        phone = ser.validated_data["phone_number"]
        password = ser.validated_data["password"]

        try:
            user = UserProfile.objects.get(phone_number=phone)
        except UserProfile.DoesNotExist:
            return Response(
                {"detail": "Telefon raqam yoki parol noto'g'ri."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Telefon raqam yoki parol noto'g'ri."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.role not in (UserProfile.Role.CASHIER, UserProfile.Role.SUPER_ADMIN):
            return Response(
                {"detail": "Bu hisob xodim hisobi emas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = _jwt_tokens_for_user(user)
        return Response(
            {
                "tokens": tokens,
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )


# ═══════════════════════════════════════════════════════════════
#  2. CUSTOMER
# ═══════════════════════════════════════════════════════════════


class CustomerMeView(APIView):
    """
    GET /api/customer/me/
    Returns the authenticated customer's profile + loyalty card data.
    """

    permission_classes = [IsCustomer]

    def get(self, request):
        serializer = CustomerProfileSerializer(request.user)
        return Response(serializer.data)


class CustomerTransactionsView(ListAPIView):
    """
    GET /api/customer/transactions/
    Returns the authenticated customer's own transaction history.
    """

    permission_classes = [IsCustomer]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(customer__user=self.request.user)


# ═══════════════════════════════════════════════════════════════
#  3. PUBLIC — Menu
# ═══════════════════════════════════════════════════════════════


class PublicStoryListView(ListAPIView):
    """
    GET /api/stories/
    Public endpoint to fetch active stories.
    """
    permission_classes = [AllowAny]
    serializer_class = StorySerializer

    def get_queryset(self):
        return Story.objects.filter(is_active=True).order_by("-created_at")


class MenuListView(ListAPIView):
    """
    GET /api/menu/
    Public endpoint — no authentication required.
    """

    permission_classes = [AllowAny]
    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()


class ShopLocationListView(ListAPIView):
    """
    GET /api/shops/
    Public endpoint to list all physical store locations.
    """

    permission_classes = [AllowAny]
    serializer_class = ShopLocationSerializer
    queryset = ShopLocation.objects.all()


class MenuCategoryListView(ListAPIView):
    """
    GET /api/categories/
    Returns all menu categories (public).
    """
    permission_classes = [AllowAny]
    serializer_class = MenuCategorySerializer
    queryset = MenuCategory.objects.all()


class MenuBannerView(APIView):
    """
    GET /api/menu-banner/ — Returns the active banner (public)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        banner = MenuBanner.objects.filter(is_active=True).first()
        if not banner:
            return Response({"image_url": None})
        return Response({"image_url": banner.image_url})


def get_site_design_state():
    """Return the saved admin choice and the design effective today in Tashkent."""
    setting = SiteDesign.objects.first()
    configured_design = setting.active_design if setting else SiteDesign.Design.ORIGINAL
    today = timezone.localdate()
    friday_automatic = today.weekday() == 4 and (
        not setting or setting.manual_override_date != today
    )
    effective_design = SiteDesign.Design.UZBEK_SILK if friday_automatic else configured_design
    return configured_design, effective_design, friday_automatic


class SiteDesignView(APIView):
    """GET /api/site-design/ — currently active customer-facing design."""

    permission_classes = [AllowAny]

    def get(self, request):
        configured_design, effective_design, is_friday = get_site_design_state()
        return Response({
            "active_design": effective_design,
            "configured_design": configured_design,
            "automatic_override": is_friday,
        })


# ═══════════════════════════════════════════════════════════════
#  ADMIN MENU MANAGEMENT
# ═══════════════════════════════════════════════════════════════


class AdminMenuItemView(APIView):
    """
    GET  /api/admin/menu/         — list all menu items
    POST /api/admin/menu/         — create new menu item
    DELETE /api/admin/menu/<id>/  — delete menu item
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        items = MenuItem.objects.all()
        return Response(MenuItemSerializer(items, many=True).data)

    def post(self, request):
        ser = MenuItemCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        item = MenuItem.objects.create(**ser.validated_data)
        return Response(MenuItemSerializer(item).data, status=status.HTTP_201_CREATED)


class AdminMenuItemDetailView(APIView):
    """
    PATCH /api/admin/menu/<id>/   — update a menu item
    DELETE /api/admin/menu/<id>/  — delete a menu item
    """
    permission_classes = [IsSuperAdmin]

    def patch(self, request, pk):
        try:
            item = MenuItem.objects.get(pk=pk)
        except MenuItem.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        ser = MenuItemCreateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        for field, value in ser.validated_data.items():
            setattr(item, field, value)
        item.save()
        return Response(MenuItemSerializer(item).data)

    def delete(self, request, pk):
        try:
            item = MenuItem.objects.get(pk=pk)
            item.delete()
            return Response({"detail": "O'chirildi."}, status=status.HTTP_200_OK)
        except MenuItem.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)


class AdminMenuCategoryView(APIView):
    """
    GET  /api/admin/categories/       — list all categories
    POST /api/admin/categories/       — create new category
    DELETE /api/admin/categories/<id>/ — delete category
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        cats = MenuCategory.objects.all()
        return Response(MenuCategorySerializer(cats, many=True).data)

    def post(self, request):
        ser = MenuCategorySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        cat = MenuCategory.objects.create(
            name=ser.validated_data["name"],
            image_url=ser.validated_data.get("image_url", ""),
            order=ser.validated_data.get("order", 0),
        )
        return Response(MenuCategorySerializer(cat).data, status=status.HTTP_201_CREATED)


class AdminMenuCategoryDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def delete(self, request, pk):
        try:
            cat = MenuCategory.objects.get(pk=pk)
            cat.delete()
            return Response({"detail": "O'chirildi."}, status=status.HTTP_200_OK)
        except MenuCategory.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)


class AdminMenuBannerView(APIView):
    """
    GET /api/admin/menu-banner/ — get active banner
    POST /api/admin/menu-banner/ — set new banner (replaces existing)
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        banner = MenuBanner.objects.filter(is_active=True).first()
        if not banner:
            return Response({"image_url": None})
        return Response(MenuBannerSerializer(banner).data)

    def post(self, request):
        image_url = request.data.get("image_url", "")
        if not image_url:
            return Response({"detail": "image_url kerak."}, status=status.HTTP_400_BAD_REQUEST)
        # Deactivate all old banners
        MenuBanner.objects.update(is_active=False)
        banner = MenuBanner.objects.create(image_url=image_url, is_active=True)
        return Response(MenuBannerSerializer(banner).data, status=status.HTTP_201_CREATED)


class AdminSiteDesignView(APIView):
    """GET/POST /api/admin/site-design/ — read or switch the active design."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        configured_design, effective_design, is_friday = get_site_design_state()
        return Response({
            "active_design": configured_design,
            "effective_design": effective_design,
            "automatic_override": is_friday,
        })

    def post(self, request):
        active_design = request.data.get("active_design")
        valid_designs = {value for value, _label in SiteDesign.Design.choices}
        if active_design not in valid_designs:
            return Response(
                {"detail": "Noto'g'ri dizayn tanlandi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        setting = SiteDesign.objects.first()
        today = timezone.localdate()
        if setting:
            setting.active_design = active_design
            setting.manual_override_date = today
            setting.save(update_fields=["active_design", "manual_override_date", "updated_at"])
        else:
            setting = SiteDesign.objects.create(
                active_design=active_design,
                manual_override_date=today,
            )
        _configured, effective_design, is_friday = get_site_design_state()
        return Response({
            "active_design": setting.active_design,
            "effective_design": effective_design,
            "automatic_override": is_friday,
        })


class AdminImageUploadView(APIView):
    """
    POST /api/admin/upload-image/
    Accepts a multipart/form-data image file.
    Saves it to media/uploads/ and returns the URL.
    The client compresses the image before upload (Canvas API),
    so we just save and serve it.
    """
    permission_classes = [IsSuperAdmin]

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB

    def post(self, request):
        from django.conf import settings

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"detail": "Rasm fayl topilmadi."}, status=status.HTTP_400_BAD_REQUEST)

        if image_file.content_type not in self.ALLOWED_TYPES:
            return Response({"detail": "Faqat JPEG, PNG, WebP yoki GIF formatlar qabul qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        if image_file.size > self.MAX_SIZE:
            return Response({"detail": "Fayl hajmi 10 MB dan oshmasligi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        # Build a safe unique filename
        ext = os.path.splitext(image_file.name)[1].lower() or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as dest:
            for chunk in image_file.chunks():
                dest.write(chunk)

        # Build relative URL
        image_url = f"{settings.MEDIA_URL}uploads/{filename}"

        return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)


class AdminStoryView(APIView):
    """
    GET /api/admin/stories/ - List all stories
    POST /api/admin/stories/ - Create new story
    """
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        stories = Story.objects.all().order_by("-created_at")
        return Response(StorySerializer(stories, many=True).data)

    def post(self, request):
        ser = StorySerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminStoryDetailView(APIView):
    """
    DELETE /api/admin/stories/<pk>/
    PATCH /api/admin/stories/<pk>/ (toggle active)
    """
    permission_classes = [IsSuperAdmin]

    def get_object(self, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(Story, pk=pk)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response({"detail": "O'chirildi."}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        story = self.get_object(pk)
        ser = StorySerializer(story, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# ═══════════════════════════════════════════════════════════════
#  4. CASHIER
# ═══════════════════════════════════════════════════════════════


class ScanQRView(APIView):
    """
    POST /api/cashier/scan-qr/
    Payload: { qr_hash }
    Returns customer name and current balance.
    """

    permission_classes = [IsCashier]

    def post(self, request):
        ser = ScanQRSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        try:
            cd = CustomerData.objects.select_related("user").get(
                qr_code_hash=ser.validated_data["qr_hash"]
            )
        except CustomerData.DoesNotExist:
            return Response(
                {"detail": "Mijoz topilmadi. QR kodni tekshiring."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "customer_id": cd.id,
                "name": cd.user.get_full_name() or cd.user.phone_number,
                "phone": cd.user.phone_number,
                "card_number": cd.formatted_card,
                "balance": str(cd.cashback_balance),
            }
        )


class PhoneSearchView(APIView):
    """
    POST /api/cashier/search-phone/
    Payload: { phone_number }
    Search customer by phone number.
    """

    permission_classes = [IsCashier]

    def post(self, request):
        ser = PhoneSearchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        phone = ser.validated_data["phone_number"].replace(" ", "").replace("-", "")

        # Search by partial phone match
        users = UserProfile.objects.filter(
            role="CUSTOMER",
            phone_number__contains=phone,
        ).select_related("customer_data")

        if not users.exists():
            return Response(
                {"detail": "Mijoz topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = users.first()
        try:
            cd = user.customer_data
        except CustomerData.DoesNotExist:
            return Response(
                {"detail": "Mijoz ma'lumotlari topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "customer_id": cd.id,
                "name": user.get_full_name() or user.phone_number,
                "phone": user.phone_number,
                "card_number": cd.formatted_card,
                "balance": str(cd.cashback_balance),
            }
        )


class CashierTransactionView(APIView):
    """
    POST /api/cashier/transaction/
    Payload: { customer_id, bill_amount, type: "EARN" | "REDEEM" }

    EARN  → calculates 1% cashback, adds to customer balance.
    REDEEM → deducts bill_amount from balance (checks sufficiency).
    """

    permission_classes = [IsCashier]

    def post(self, request):
        ser = CashierTransactionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        customer_id = ser.validated_data["customer_id"]
        bill_amount = ser.validated_data["bill_amount"]
        txn_type = ser.validated_data["type"]

        try:
            cd = CustomerData.objects.select_related("user").get(id=customer_id)
        except CustomerData.DoesNotExist:
            return Response(
                {"detail": "Mijoz topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if txn_type == "EARN":
            # 1% cashback
            cashback = (bill_amount * Decimal("0.01")).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
            cd.cashback_balance += cashback
            cd.save(update_fields=["cashback_balance"])

            Transaction.objects.create(
                customer=cd,
                cashier=request.user,
                transaction_type=Transaction.Type.EARN,
                bill_amount=bill_amount,
                cashback_amount=cashback,
            )

            return Response(
                {
                    "detail": f"+{cashback} so'm cashback berildi.",
                    "cashback_amount": str(cashback),
                    "new_balance": str(cd.cashback_balance),
                }
            )

        else:  # REDEEM
            if cd.cashback_balance <= 0:
                return Response(
                    {
                        "detail": "Keshbek balansi nolga teng. Yechish uchun mablag' yo'q.",
                        "current_balance": "0.00",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            deducted_amount = min(bill_amount, cd.cashback_balance)
            remaining_payable = bill_amount - deducted_amount

            cd.cashback_balance -= deducted_amount
            cd.save(update_fields=["cashback_balance"])

            Transaction.objects.create(
                customer=cd,
                cashier=request.user,
                transaction_type=Transaction.Type.REDEEM,
                bill_amount=bill_amount,
                cashback_amount=deducted_amount,
            )

            return Response(
                {
                    "detail": f"Cashback deducted: {deducted_amount} UZS. Please collect remaining {remaining_payable} UZS from the customer.",
                    "redeemed_amount": str(deducted_amount),
                    "remaining_payable": str(remaining_payable),
                    "new_balance": str(cd.cashback_balance),
                }
            )


# ═══════════════════════════════════════════════════════════════
#  5. SUPER ADMIN
# ═══════════════════════════════════════════════════════════════

class AdminCustomersView(ListAPIView):
    """
    GET /api/admin/customers/
    Returns a list of all registered customers with their loyalty card data.
    """
    permission_classes = [IsSuperAdmin]
    serializer_class = CustomerProfileSerializer

    def get_queryset(self):
        return UserProfile.objects.filter(role=UserProfile.Role.CUSTOMER).order_by("-date_joined")


class AdminStatsView(APIView):
    """
    GET /api/admin/stats/
    Returns global dashboard statistics.
    """

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_users = UserProfile.objects.filter(role="CUSTOMER").count()

        agg = Transaction.objects.aggregate(
            revenue=Sum("bill_amount", default=Decimal("0")),
            issued=Sum(
                "cashback_amount",
                filter=Q(transaction_type="EARN"),
                default=Decimal("0"),
            ),
            redeemed=Sum(
                "cashback_amount",
                filter=Q(transaction_type="REDEEM"),
                default=Decimal("0"),
            ),
        )

        liability = (
            CustomerData.objects.aggregate(
                total=Sum("cashback_balance", default=Decimal("0"))
            )["total"]
        )

        data = {
            "total_users": total_users,
            "total_revenue": agg["revenue"],
            "total_cashback_issued": agg["issued"],
            "total_redeemed": agg["redeemed"],
            "system_liability": liability,
        }

        serializer = AdminStatsSerializer(data)
        return Response(serializer.data)


class AdminTransactionsView(ListAPIView):
    """
    GET /api/admin/transactions/
    Returns all transactions (global history).
    """

    permission_classes = [IsSuperAdmin]
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all()


class CreateEmployeeView(APIView):
    """
    POST /api/admin/employees/
    Payload: { phone_number, password, first_name, last_name? }
    Creates a new CASHIER user account.
    """

    permission_classes = [IsSuperAdmin]

    def post(self, request):
        ser = EmployeeCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        user = UserProfile.objects.create_user(
            username=ser.validated_data["phone_number"],
            phone_number=ser.validated_data["phone_number"],
            password=ser.validated_data["password"],
            first_name=ser.validated_data["first_name"],
            last_name=ser.validated_data.get("last_name", ""),
            role=UserProfile.Role.CASHIER,
        )

        return Response(
            {
                "detail": "Yangi kassir yaratildi.",
                "employee": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class CashierTodayTransactionsView(ListAPIView):
    """
    GET /api/cashier/my-transactions/
    Returns today's transactions processed by the currently logged-in cashier.
    Accessible to CASHIER and SUPER_ADMIN.
    """

    permission_classes = [IsCashier]
    serializer_class = TransactionSerializer

    def get_queryset(self):
        from django.utils.timezone import localdate
        today = localdate()
        return Transaction.objects.filter(
            cashier=self.request.user,
            timestamp__date=today,
        ).select_related("customer__user", "cashier")
