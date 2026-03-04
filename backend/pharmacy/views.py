from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from io import StringIO
from django.db.models import Q, F, Sum
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from PIL import Image, ImageDraw, ImageFont
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from appointments.models import Prescription
from accounts.permissions import IsDoctor, IsPatient, IsAdmin
from .models import InventoryItem, Transaction, PharmacyOrder, PharmacyOrderItem
from .serializers import (
    InventoryItemSerializer,
    InventoryStatsSerializer,
    TransactionSerializer,
    CatalogItemSerializer,
    PharmacyOrderSerializer,
)
from .services import create_order_from_prescription, complete_order_and_create_sale, recalc_order_totals
from accounts.models import PatientProfile
import uuid
import re
from .permissions import CanManageInventory


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by("name")
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated, CanManageInventory]

    def get_queryset(self):
        qs = super().get_queryset()
        # Limit to current pharmacy's inventory
        try:
            user = self.request.user
            if getattr(user, "role", "").upper() == "PHARMACY":
                qs = qs.filter(created_by=user)
        except Exception:
            pass
        q = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        supplier = self.request.query_params.get("supplier")
        low_stock = self.request.query_params.get("low_stock")
        expired = self.request.query_params.get("expired")
        if q:
            s = q.strip()
            qs = qs.filter(Q(name__icontains=s) | Q(category__icontains=s))
        if category:
            qs = qs.filter(category__iexact=category)
        if supplier:
            qs = qs.filter(supplier__icontains=supplier)
        if low_stock in ("1", "true", "True", "TRUE"):
            qs = qs.filter(stock__lt=F("min_stock"))
        if expired in ("1", "true", "True", "TRUE"):
            qs = qs.filter(expiry__lt=date.today())
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        total_items = qs.count()
        low_stock = qs.filter(stock__lt=F("min_stock")).count()
        total_value = qs.aggregate(val=Sum(F("stock") * F("price")))["val"] or Decimal("0.00")
        data = {"total_items": total_items, "low_stock": low_stock, "total_value": total_value}
        return Response(InventoryStatsSerializer(data).data)

    @action(detail=True, methods=["post"])
    def stock(self, request, pk=None):
        item = self.get_object()
        delta = request.data.get("delta")
        set_value = request.data.get("set")
        old_stock = item.stock
        if delta is not None:
            try:
                delta_int = int(delta)
                item.stock = max(0, item.stock + delta_int)
            except Exception:
                return Response({"detail": "delta must be integer"}, status=400)
        elif set_value is not None:
            try:
                set_int = int(set_value)
                item.stock = max(0, set_int)
            except Exception:
                return Response({"detail": "set must be integer"}, status=400)
        else:
            return Response({"detail": "Provide delta or set"}, status=400)
        item.save(update_fields=["stock", "updated_at"])
        # Hook: auto-create RESTOCK/ADJUSTMENT transactions on stock changes
        try:
            change = item.stock - old_stock
            details = request.data.get("details") or "Stock update"
            amount = request.data.get("amount")
            try:
                amount_val = float(amount) if amount is not None else 0.0
            except Exception:
                amount_val = 0.0
            if change != 0:
                t_type = Transaction.Type.RESTOCK if change > 0 else Transaction.Type.ADJUSTMENT
                Transaction.objects.create(
                    type=t_type,
                    details=details if change > 0 else f"Adjustment: {details}",
                    amount=-(abs(amount_val)) if change > 0 else 0,  # expense on restock; 0 for adjustments unless provided
                    status=Transaction.Status.APPROVED if t_type == Transaction.Type.RESTOCK else Transaction.Status.COMPLETED,
                    user=request.user,
                    item=item,
                    quantity=abs(change),
                )
        except Exception:
            pass
        return Response(InventoryItemSerializer(item).data)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("user", "item").all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, CanManageInventory]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        q = self.request.query_params.get("q") or self.request.query_params.get("search")
        types = self.request.query_params.get("types")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        # Limit to current pharmacy's transactions
        try:
            if getattr(user, "role", "").upper() == "PHARMACY":
                qs = qs.filter(user=user)
        except Exception:
            pass
        if q:
            s = q.strip()
            qs = qs.filter(
                Q(trx_code__icontains=s)
                | Q(details__icontains=s)
                | Q(user__username__icontains=s)
                | Q(item__name__icontains=s)
            )
        if types:
            t = [t.strip().upper() for t in types.split(",") if t.strip()]
            qs = qs.filter(type__in=t)
        if date_from:
            try:
                qs = qs.filter(created_at__date__gte=datetime.fromisoformat(date_from).date())
            except Exception:
                pass
        if date_to:
            try:
                qs = qs.filter(created_at__date__lte=datetime.fromisoformat(date_to).date())
            except Exception:
                pass
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.get_queryset()
        import csv
        import re

        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Transaction ID", "Date", "Time", "Type", "Details", "Amount", "Status", "Patient"])
        for t in qs:
            patient_name = None
            try:
                m = re.search(r"Order\s+(ORD-\d+)", t.details or "")
                if m:
                    code = m.group(1)
                    o = PharmacyOrder.objects.select_related("patient").filter(code=code).first()
                    if o and o.patient:
                        full = f"{getattr(o.patient, 'first_name', '')} {getattr(o.patient, 'last_name', '')}".strip()
                        patient_name = full or o.patient.username
            except Exception:
                patient_name = None
            writer.writerow(
                [
                    t.trx_code,
                    t.created_at.date().isoformat(),
                    t.created_at.strftime("%H:%M"),
                    t.get_type_display(),
                    t.details,
                    f"{t.amount}",
                    t.get_status_display(),
                    patient_name or (t.user.username if t.user else "System"),
                ]
            )
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="transactions.csv"'
        return response

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        t = self.get_object()
        img = Image.new("RGB", (600, 500), color="white")
        draw = ImageDraw.Draw(img)
        y = 30
        draw.text((220, y), "Payment Receipt", fill="black"); y += 30
        draw.line((20, y, 580, y), fill="black"); y += 10
        draw.text((40, y), f"Transaction: {t.trx_code}", fill="black"); y += 25
        draw.text((40, y), f"Date: {t.created_at.strftime('%Y-%m-%d %H:%M')}", fill="black"); y += 25
        draw.text((40, y), f"Type: {t.get_type_display()}", fill="black"); y += 25
        draw.text((40, y), f"Details: {t.details}", fill="black"); y += 25
        draw.text((40, y), f"Amount: {t.amount}", fill="black"); y += 25
        draw.text((40, y), f"Status: {t.get_status_display()}", fill="black"); y += 25
        draw.text((40, y), f"User: {(t.user.username if t.user else 'System')}", fill="black"); y += 25
        draw.line((20, y, 580, y), fill="black"); y += 30
        draw.text((40, y), "Thank you!", fill="black")
        pdf = BytesIO()
        img.save(pdf, "PDF", resolution=100.0)
        pdf.seek(0)
        response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt_{t.trx_code}.pdf"'
        return response


class CatalogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryItem.objects.select_related("created_by").all()
    serializer_class = CatalogItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("q")
        pharmacy_id = self.request.query_params.get("pharmacy_id")
        specialization = self.request.query_params.get("specialization")
        if q:
            s = q.strip()
            qs = qs.filter(Q(name__icontains=s) | Q(category__icontains=s) | Q(supplier__icontains=s))
        if pharmacy_id:
            try:
                qs = qs.filter(created_by_id=int(pharmacy_id))
            except Exception:
                pass
        if specialization:
            spec = specialization.strip()
            spec_map = {
                "Cardiologist": ["Cardiac", "Heart"],
                "Dermatologist": ["Skin", "Dermatology"],
                "Neurologist": ["Neuro", "Neurology"],
                "Orthopedic": ["Orthopedic", "Bones"],
                "Ophthalmologist": ["Eye", "Ophthalmology"],
                "Pediatrician": ["Pediatric", "Children"],
                "Psychiatrist": ["Psychiatry", "CNS", "Neuro"],
                "ENT Specialist": ["ENT", "Otolaryngology", "Ear", "Nose", "Throat"],
                "Gynecologist": ["Gynecology", "Women", "OBGYN"],
                "Urologist": ["Urology", "Renal", "Urinary"],
                "General Physician": ["General", "Antibiotics", "Painkiller", "Vitamins"],
            }
            cats = []
            for k, v in spec_map.items():
                if k.lower() in spec.lower():
                    cats = v
                    break
            if cats:
                cond = None
                for c in cats:
                    clause = Q(category__icontains=c)
                    cond = clause if cond is None else (cond | clause)
                if cond is not None:
                    qs = qs.filter(cond)
        return qs.order_by("name")

    def get_permissions(self):
        # Allow Doctor, Pharmacy, and Admin to read catalog
        return [IsAuthenticated()]


class PharmacyOrderViewSet(viewsets.ModelViewSet):
    queryset = PharmacyOrder.objects.select_related("pharmacy", "patient").prefetch_related("items")
    serializer_class = PharmacyOrderSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="manual")
    def manual(self, request):
        try:
            # Create an order without a prescription, using current pharmacy inventory
            user = request.user
            if getattr(user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
                return Response({"detail": "Forbidden"}, status=403)
            # Accept either patient_id or free-text patient_name
            patient = None
            patient_id = request.data.get("patient_id")
            patient_name = (request.data.get("patient_name") or "").strip()
            if patient_id is not None:
                try:
                    patient = get_object_or_404(get_user_model(), pk=int(patient_id))
                except Exception:
                    return Response({"detail": "Invalid patient_id"}, status=400)
            else:
                if not patient_name:
                    return Response({"detail": "patient_name is required when patient_id is not provided"}, status=400)
                # Create a lightweight patient user for this order
                User = get_user_model()
                # Try to split first/last name
                parts = [p for p in re.split(r"\s+", patient_name) if p]
                first_name = parts[0] if parts else patient_name
                last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
                # Generate a unique username
                base = re.sub(r"[^a-zA-Z0-9]+", "-", patient_name).strip("-").lower() or "guest"
                username = f"{base}-{uuid.uuid4().hex[:8]}"
                patient = User.objects.create_user(
                    username=username,
                    password=uuid.uuid4().hex,
                    first_name=first_name[:30],
                    last_name=last_name[:150],
                    role=getattr(User, "Role").PATIENT,
                )
                try:
                    PatientProfile.objects.get_or_create(user=patient)
                except Exception:
                    pass
            items = request.data.get("items") or []
            if not isinstance(items, list) or not items:
                return Response({"detail": "items is required"}, status=400)
            order = PharmacyOrder.objects.create(
                prescription_id=0,
                patient=patient,
                pharmacy=user,  # bind to current user account for visibility
                created_by=user,
                total_amount=0,
            )
            total = Decimal("0.00")
            for it in items:
                inv_id = (it or {}).get("inventory_id")
                qty = int((it or {}).get("quantity") or 0)
                if qty <= 0 or not inv_id:
                    continue
                inv = InventoryItem.objects.filter(id=inv_id).first()
                if not inv:
                    continue
                poi = PharmacyOrderItem.objects.create(
                    order=order,
                    item=inv,
                    name=inv.name,
                    quantity=qty,
                    unit_price=inv.price or Decimal("0.00"),
                )
                total += poi.amount or Decimal("0.00")
            order.total_amount = total
            order.save(update_fields=["total_amount"])
            return Response(PharmacyOrderSerializer(order).data, status=201)
        except Exception as e:
            return Response({"detail": f"Order create failed: {str(e)}"}, status=400)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        status_param = self.request.query_params.get("status")
        if getattr(user, "role", "").upper() == "PHARMACY":
            qs = qs.filter(pharmacy=user)
        elif getattr(user, "role", "").upper() == "PATIENT":
            qs = qs.filter(patient=user)
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Use /from-prescription/ endpoint"}, status=400)

    @action(detail=False, methods=["post"], url_path="from-prescription/(?P<prescription_id>[^/.]+)")
    def from_prescription(self, request, prescription_id=None):
        if getattr(request.user, "role", "").upper() not in ("PATIENT", "ADMIN"):
            return Response({"detail": "Only patients can place orders"}, status=403)
        presc = get_object_or_404(Prescription, pk=prescription_id)
        # Split by pharmacy owner of inventory item
        # Build unique list of pharmacies referenced by items
        pharmacies = {}
        for it in presc.items.all():
            inv = InventoryItem.objects.filter(name__iexact=it.name).first()
            owner = getattr(inv, "created_by", None) or getattr(presc, "pharmacy", None)
            if owner:
                pharmacies.setdefault(owner.id, owner)
        if not pharmacies and getattr(presc, "pharmacy", None):
            pharmacies[presc.pharmacy.id] = presc.pharmacy
        if not pharmacies:
            return Response({"detail": "No target pharmacy found for items"}, status=400)
        orders = []
        for _, pharm in pharmacies.items():
            existing = PharmacyOrder.objects.filter(prescription_id=presc.id, pharmacy=pharm).exclude(status=PharmacyOrder.Status.CANCELLED).first()
            if existing:
                orders.append(existing)
                continue
            order = create_order_from_prescription(presc, pharm, request.user)
            orders.append(order)
        data = PharmacyOrderSerializer(orders, many=True).data
        return Response(data, status=201)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        order = self.get_object()
        if getattr(request.user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
            return Response({"detail": "Forbidden"}, status=403)
        if order.status not in (order.Status.PENDING,):
            return Response({"detail": "Order not in pending state"}, status=400)
        try:
            order = recalc_order_totals(order)
        except Exception:
            pass
        order.status = order.Status.ACCEPTED
        order.accepted_by = request.user
        order.save(update_fields=["status", "accepted_by", "updated_at"])
        return Response(PharmacyOrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        order = self.get_object()
        if getattr(request.user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
            return Response({"detail": "Forbidden"}, status=403)
        if order.status not in (order.Status.PENDING, order.Status.ACCEPTED):
            return Response({"detail": "Order cannot be cancelled now"}, status=400)
        order.status = order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return Response(PharmacyOrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if getattr(request.user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
            return Response({"detail": "Forbidden"}, status=403)
        if order.status not in (order.Status.ACCEPTED, order.Status.PENDING):
            return Response({"detail": "Order not in acceptable state"}, status=400)
        try:
            order = recalc_order_totals(order)
        except Exception:
            pass
        # Check stock sufficiency
        insufficient = []
        for it in order.items.select_related("item"):
            if it.item and it.quantity and it.item.stock < it.quantity:
                insufficient.append({"item_id": it.item.id, "name": it.name, "required": it.quantity, "available": it.item.stock})
        if insufficient:
            return Response({"detail": "Insufficient stock", "insufficient_items": insufficient}, status=409)
        order = complete_order_and_create_sale(order, request.user)
        # If all orders for this prescription are completed, optionally update external prescription pharmacy_status
        try:
            presc = Prescription.objects.get(id=order.prescription_id)
            from appointments.models import Prescription as PModel
            others = PharmacyOrder.objects.filter(prescription_id=presc.id).exclude(status=PModel.PharmacyStatus.COMPLETED)
            if not others.exists():
                presc.pharmacy_status = PModel.PharmacyStatus.COMPLETED
                presc.save(update_fields=["pharmacy_status", "updated_at"])
        except Exception:
            pass
        return Response(PharmacyOrderSerializer(order).data)

    @action(detail=False, methods=["post"], url_path="backfill-from-prescriptions")
    def backfill_from_prescriptions(self, request):
        # Create missing orders for this pharmacy from active prescriptions where
        # at least one item matches this pharmacy's inventory by name (case-insensitive).
        if getattr(request.user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
            return Response({"detail": "Forbidden"}, status=403)
        target_pharmacy = request.user
        created = 0
        try:
            from .services import create_order_from_prescription
            # Active prescriptions only
            prescs = Prescription.objects.all().order_by("-created_at")
            for p in prescs:
                # skip if already have order for this pharmacy
                if PharmacyOrder.objects.filter(prescription_id=p.id, pharmacy=target_pharmacy).exists():
                    continue
                # check any item matches this pharmacy's inventory
                matched = False
                for it in p.items.all():
                    inv = InventoryItem.objects.filter(name__iexact=it.name, created_by=target_pharmacy).first()
                    if inv:
                        matched = True
                        break
                if matched:
                    try:
                        create_order_from_prescription(p, target_pharmacy, request.user)
                        created += 1
                    except Exception:
                        continue
        except Exception:
            pass
        # Recalculate totals for all orders of this pharmacy
        try:
            for o in PharmacyOrder.objects.filter(pharmacy=target_pharmacy):
                try:
                    recalc_order_totals(o)
                except Exception:
                    continue
        except Exception:
            pass
        qs = self.get_queryset().filter(pharmacy=target_pharmacy)
        data = PharmacyOrderSerializer(qs, many=True).data
        return Response({"created": created, "orders": data})

    @action(detail=False, methods=["post"], url_path="recalculate-totals")
    def recalculate_totals(self, request):
        if getattr(request.user, "role", "").upper() not in ("PHARMACY", "ADMIN"):
            return Response({"detail": "Forbidden"}, status=403)
        count = 0
        for o in PharmacyOrder.objects.filter(pharmacy=request.user):
            try:
                recalc_order_totals(o)
                count += 1
            except Exception:
                continue
        qs = self.get_queryset().filter(pharmacy=request.user)
        return Response({"updated": count, "orders": PharmacyOrderSerializer(qs, many=True).data})

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        order = self.get_object()
        img = Image.new("RGB", (700, 800), color="white")
        draw = ImageDraw.Draw(img)
        y = 30
        draw.text((260, y), "Medication Bill", fill="black"); y += 30
        draw.line((20, y, 680, y), fill="black"); y += 10
        draw.text((40, y), f"Order: {getattr(order, 'code', order.id)}", fill="black"); y += 25
        draw.text((40, y), f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M')}", fill="black"); y += 25
        draw.text((40, y), f"Patient: {(order.patient.username if order.patient else 'Unknown')}", fill="black"); y += 25
        draw.text((40, y), f"Pharmacy: {(order.pharmacy.username if order.pharmacy else 'Unknown')}", fill="black"); y += 25
        draw.line((20, y, 680, y), fill="black"); y += 10
        draw.text((40, y), "Items:", fill="black"); y += 25
        draw.text((40, y), "Name", fill="black")
        draw.text((360, y), "Qty", fill="black")
        draw.text((460, y), "Unit Price", fill="black")
        draw.text((590, y), "Line Total", fill="black"); y += 20
        draw.line((20, y, 680, y), fill="black"); y += 10
        total = Decimal("0.00")
        for it in order.items.all():
            name = it.name or (it.item.name if it.item else "")
            qty = int(it.quantity or 0)
            unit = Decimal(str(it.unit_price or it.item.price if getattr(it, "item", None) else 0))
            line_total = unit * qty
            total += line_total
            draw.text((40, y), str(name)[:34], fill="black")
            draw.text((360, y), f"{qty}", fill="black")
            draw.text((460, y), f"{unit}", fill="black")
            draw.text((590, y), f"{line_total}", fill="black")
            y += 22
            if y > 720:
                break
        draw.line((20, y, 680, y), fill="black"); y += 10
        draw.text((480, y), "Total:", fill="black")
        draw.text((590, y), f"{total}", fill="black"); y += 30
        draw.text((40, y), "Thank you for your purchase!", fill="black")
        pdf = BytesIO()
        img.save(pdf, "PDF", resolution=100.0)
        pdf.seek(0)
        response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
        fn = f"bill_{getattr(order, 'code', order.id)}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{fn}"'
        return response
