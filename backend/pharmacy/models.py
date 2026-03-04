from django.db import models
from django.conf import settings
from django.utils import timezone


class InventoryItem(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    stock = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_inventory_items"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["created_by", "name"], name="unique_item_per_pharmacy"),
        ]

    def __str__(self):
        return self.name


class Transaction(models.Model):
    class Type(models.TextChoices):
        SALE = "SALE", "Sale"
        RESTOCK = "RESTOCK", "Restock"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    class Status(models.TextChoices):
        COMPLETED = "COMPLETED", "Completed"
        APPROVED = "APPROVED", "Approved"
        PENDING = "PENDING", "Pending"

    trx_code = models.CharField(max_length=20, unique=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    type = models.CharField(max_length=12, choices=Type.choices)
    details = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.COMPLETED)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="pharmacy_transactions")
    item = models.ForeignKey(InventoryItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    quantity = models.IntegerField(default=0)
    applied = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating and not self.trx_code:
            self.trx_code = f"TRX-{self.id:04d}"
            super().save(update_fields=["trx_code"])
        # apply stock once
        if creating and not self.applied and self.item_id and self.quantity:
            if self.type == self.Type.SALE:
                self.item.stock = max(0, self.item.stock - abs(self.quantity))
            else:
                # RESTOCK or ADJUSTMENT apply quantity sign as provided
                self.item.stock = max(0, self.item.stock + self.quantity)
            self.item.save(update_fields=["stock", "updated_at"])
            self.applied = True
            super().save(update_fields=["applied"])


class PharmacyOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    code = models.CharField(max_length=20, unique=True, blank=True)
    prescription_id = models.IntegerField()  # references appointments.Prescription id
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pharmacy_orders")
    pharmacy = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="incoming_orders")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_orders")
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="accepted_orders")
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="completed_orders")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        creating = self.pk is None
        super().save(*args, **kwargs)
        if creating and not self.code:
            self.code = f"ORD-{self.id:04d}"
            super().save(update_fields=["code"])


class PharmacyOrderItem(models.Model):
    order = models.ForeignKey(PharmacyOrder, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey(InventoryItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")
    name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    @property
    def amount(self):
        try:
            return (self.unit_price or 0) * (self.quantity or 0)
        except Exception:
            return 0
