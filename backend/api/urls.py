"""
Saxovat — API URL routing
==============================
All endpoints are prefixed with /api/ (set in candyland/urls.py).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── Auth ──
    path("auth/token-refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/staff-login/", views.StaffLoginView.as_view(), name="staff-login"),


    # ── Public ──
    path("menu/", views.MenuListView.as_view(), name="menu-list"),
    path("shops/", views.ShopLocationListView.as_view(), name="shop-list"),
    path("categories/", views.MenuCategoryListView.as_view(), name="category-list"),
    path("menu-banner/", views.MenuBannerView.as_view(), name="menu-banner"),
    path("site-design/", views.SiteDesignView.as_view(), name="site-design"),
    path("stories/", views.PublicStoryListView.as_view(), name="story-list"),


    # ── Super Admin ──
    path("admin/employees/", views.CreateEmployeeView.as_view(), name="admin-create-employee"),

    # ── Admin Menu Management ──
    path("admin/menu/", views.AdminMenuItemView.as_view(), name="admin-menu"),
    path("admin/menu/<int:pk>/", views.AdminMenuItemDetailView.as_view(), name="admin-menu-detail"),
    path("admin/categories/", views.AdminMenuCategoryView.as_view(), name="admin-categories"),
    path("admin/categories/<int:pk>/", views.AdminMenuCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/menu-banner/", views.AdminMenuBannerView.as_view(), name="admin-menu-banner"),
    path("admin/site-design/", views.AdminSiteDesignView.as_view(), name="admin-site-design"),
    path("admin/upload-image/", views.AdminImageUploadView.as_view(), name="admin-upload-image"),

    # ── Admin Stories ──
    path("admin/stories/", views.AdminStoryView.as_view(), name="admin-stories"),
    path("admin/stories/<int:pk>/", views.AdminStoryDetailView.as_view(), name="admin-story-detail"),
]
