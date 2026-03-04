from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryViewSet, TransactionViewSet, CatalogViewSet, PharmacyOrderViewSet

router = DefaultRouter()
router.register(r"inventory", InventoryViewSet, basename="inventory")
router.register(r"transactions", TransactionViewSet, basename="transactions")
router.register(r"catalog", CatalogViewSet, basename="catalog")
router.register(r"orders", PharmacyOrderViewSet, basename="orders")

urlpatterns = [
    path("", include(router.urls)),
]
