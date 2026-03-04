from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import Payment
from .serializers import PaymentAdminListSerializer, PaymentSubmitSerializer


class PaymentSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentSubmitSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Payment submitted successfully."},
            status=status.HTTP_201_CREATED,
        )


class AdminPaymentListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        queryset = Payment.objects.select_related("user", "appointment").all()
        serializer = PaymentAdminListSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)


class _AdminPaymentActionBaseView(APIView):
    permission_classes = [IsAdmin]
    target_status = None
    target_paid_value = False

    def patch(self, request, pk):
        payment = get_object_or_404(Payment, pk=pk)
        payment.status = self.target_status
        payment.save(update_fields=["status", "updated_at"])
        appointment = payment.appointment
        appointment.is_paid = self.target_paid_value
        appointment.save(update_fields=["is_paid", "updated_at"])
        serializer = PaymentAdminListSerializer(payment, context={"request": request})
        return Response(serializer.data)


class AdminApprovePaymentView(_AdminPaymentActionBaseView):
    target_status = Payment.Status.APPROVED
    target_paid_value = True


class AdminRejectPaymentView(_AdminPaymentActionBaseView):
    target_status = Payment.Status.REJECTED
    target_paid_value = False
