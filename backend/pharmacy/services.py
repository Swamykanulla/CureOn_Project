from decimal import Decimal
from django.db import transaction as db_transaction
from django.contrib.auth import get_user_model
from appointments.models import Prescription, PrescriptionItem
from .models import InventoryItem, PharmacyOrder, PharmacyOrderItem, Transaction

User = get_user_model()


def _infer_quantity_from_rx(item: PrescriptionItem) -> int:
    try:
        q = int(getattr(item, "quantity", 0) or 0)
        if q > 0:
            return q
    except Exception:
        pass
    # Business rule: quantity is independent of duration; default to 1
    return 1


def create_order_from_prescription(prescription: Prescription, pharmacy: User, created_by: User) -> PharmacyOrder:
    with db_transaction.atomic():
        order = PharmacyOrder.objects.create(
            prescription_id=prescription.id,
            patient=prescription.patient,
            pharmacy=pharmacy,
            created_by=created_by,
            total_amount=Decimal("0.00"),
        )
        total = Decimal("0.00")
        for it in prescription.items.all():
            inv = InventoryItem.objects.filter(name__iexact=it.name, created_by=pharmacy).first() or \
                  InventoryItem.objects.filter(name__iexact=it.name).first()
            unit_price = inv.price if inv else (it.unit_price or Decimal("0.00"))
            poi = PharmacyOrderItem.objects.create(
                order=order,
                item=inv,
                name=it.name,
                quantity=_infer_quantity_from_rx(it),
                unit_price=unit_price or Decimal("0.00"),
            )
            total += poi.amount or Decimal("0.00")
        order.total_amount = total
        order.save(update_fields=["total_amount"])
        return order


def recalc_order_totals(order: PharmacyOrder) -> PharmacyOrder:
    total = Decimal("0.00")
    changed = False
    for it in order.items.select_related("item"):
        if not it.quantity or it.quantity <= 0:
            # recover from the original prescription if exists; else default to 1
            try:
                rx = PrescriptionItem.objects.filter(prescription_id=order.prescription_id, name__iexact=it.name).first()
            except Exception:
                rx = None
            new_q = _infer_quantity_from_rx(rx) if rx else 1
            it.quantity = new_q
            it.save(update_fields=["quantity"])
            changed = True
        if not it.unit_price or it.unit_price == 0:
            if it.item and it.item.price:
                it.unit_price = it.item.price
                it.save(update_fields=["unit_price"])
                changed = True
        total += (it.unit_price or Decimal("0.00")) * (it.quantity or 0)
    if changed or order.total_amount != total:
        order.total_amount = total
        order.save(update_fields=["total_amount", "updated_at"])
    return order


def complete_order_and_create_sale(order: PharmacyOrder, completed_by: User) -> PharmacyOrder:
    from .models import Transaction  # avoid circular

    with db_transaction.atomic():
        if order.status == PharmacyOrder.Status.COMPLETED:
            return order
        order.status = PharmacyOrder.Status.COMPLETED
        order.completed_by = completed_by
        order.save(update_fields=["status", "completed_by", "updated_at"])

        for it in order.items.select_related("item"):
            if it.item and it.quantity:
                Transaction.objects.create(
                    type=Transaction.Type.SALE,
                    details=f"Order {order.code} - {it.name}",
                    amount=it.amount or Decimal("0.00"),
                    status=Transaction.Status.COMPLETED,
                    user=completed_by,
                    item=it.item,
                    quantity=it.quantity,
                )
        if not Transaction.objects.filter(details__icontains=order.code, type=Transaction.Type.SALE).exists():
            Transaction.objects.create(
                type=Transaction.Type.SALE,
                details=f"Order {order.code} - Prescription Sale",
                amount=order.total_amount or Decimal("0.00"),
                status=Transaction.Status.COMPLETED,
                user=completed_by,
            )
        return order
