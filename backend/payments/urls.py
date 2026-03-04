from django.urls import path

from .views import (
    AdminApprovePaymentView,
    AdminPaymentListView,
    AdminRejectPaymentView,
    PaymentSubmitView,
)

urlpatterns = [
    path("submit/", PaymentSubmitView.as_view(), name="payment_submit"),
    path("admin/list/", AdminPaymentListView.as_view(), name="admin_payment_list"),
    path(
        "admin/<uuid:pk>/approve/",
        AdminApprovePaymentView.as_view(),
        name="admin_payment_approve",
    ),
    path(
        "admin/<uuid:pk>/reject/",
        AdminRejectPaymentView.as_view(),
        name="admin_payment_reject",
    ),
]

