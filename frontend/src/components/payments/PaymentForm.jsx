import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { paymentsService } from "@/services/payments";

const VALID_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

const PaymentForm = ({
  open,
  onOpenChange,
  appointmentId,
  onSubmitted,
  paymentStatus,
  existingTransactionId,
}) => {
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTransactionId(existingTransactionId || "");
    }
  }, [open, existingTransactionId]);

  const resetForm = () => {
    setTransactionId("");
    setScreenshot(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!appointmentId) {
      toast.error("Appointment is required.");
      return;
    }
    if (!transactionId.trim()) {
      toast.error("Transaction ID is required.");
      return;
    }
    if (!screenshot) {
      toast.error("Screenshot is required.");
      return;
    }
    if (!VALID_IMAGE_TYPES.includes(screenshot.type)) {
      toast.error("Screenshot must be JPG, JPEG, or PNG.");
      return;
    }
    if (screenshot.size > MAX_SCREENSHOT_SIZE) {
      toast.error("Screenshot must not exceed 5MB.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await paymentsService.submit({
        appointment_id: appointmentId,
        transaction_id: transactionId.trim(),
        screenshot,
      });
      toast.success(response?.detail || "Payment submitted successfully.");
      onSubmitted && onSubmitted();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      const data = error?.response?.data;
      const firstError =
        data?.detail ||
        data?.transaction_id?.[0] ||
        data?.screenshot?.[0] ||
        data?.appointment_id?.[0] ||
        "Payment submission failed.";
      toast.error(firstError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Payment Details</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {paymentStatus && (
            <div className="rounded-md border p-3 text-sm bg-secondary/20">
              Existing payment status: <span className="font-medium">{paymentStatus}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter transaction ID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="screenshot">Screenshot (JPG, JPEG, PNG, max 5MB)</Label>
            <Input
              id="screenshot"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Submitting..." : paymentStatus === "Rejected" ? "Pay Again" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;
