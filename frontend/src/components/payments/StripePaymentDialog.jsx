import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { appointmentsService } from "@/services/api";

const CheckoutForm = ({ paymentIntentId, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        // Verify with backend, poll while processing
        const verifyOnce = async () => {
          try {
            const res = await appointmentsService.verifyPaymentIntent(paymentIntentId);
            if (res?.status === "succeeded") {
              toast.success("Payment successful");
              onSuccess?.();
              onClose?.(false);
              return true;
            }
            if (res?.status === "processing") {
              return false;
            }
            toast.error(res?.detail || "Payment not completed");
            return null;
          } catch (err) {
            const msg = err?.response?.data?.detail || err?.message || "Payment verification failed";
            toast.error(String(msg));
            return null;
          }
        };
        let attempts = 0;
        let done = await verifyOnce();
        while (done === false && attempts < 15) {
          await new Promise(r => setTimeout(r, 2000));
          attempts += 1;
          done = await verifyOnce();
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Payment failed";
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <div className="flex justify-end">
        <Button type="submit" disabled={!stripe || submitting}>
          {submitting ? "Processing..." : "Pay"}
        </Button>
      </div>
    </form>
  );
};

const StripePaymentDialog = ({ open, onOpenChange, appointmentId, onSuccess }) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  useEffect(() => {
    if (!open || !appointmentId) return;
    let active = true;
    (async () => {
      try {
        const cfg = await appointmentsService.stripeConfig();
        if (!cfg?.public_key) {
          toast.error("Stripe not configured");
          return;
        }
        setStripePromise(loadStripe(cfg.public_key));
        const res = await appointmentsService.createPaymentIntent(appointmentId);
        if (!active) return;
        setClientSecret(res.client_secret);
        setPaymentIntentId(res.payment_intent_id);
      } catch (e) {
        const msg = e?.response?.data?.detail || e?.message || "Unable to initialize payment";
        // Fallback: redirect-based checkout on any failure creating a PaymentIntent
        try {
          const chk = await appointmentsService.createVideoPayment(appointmentId);
          if (chk?.url) {
            window.location.href = chk.url;
            return;
          }
        } catch {}
        toast.error(String(msg));
      }
    })();
    return () => {
      active = false;
    };
  }, [open, appointmentId]);

  const options = useMemo(() => (clientSecret ? { clientSecret } : null), [clientSecret]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        {stripePromise && options ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm paymentIntentId={paymentIntentId} onSuccess={onSuccess} onClose={onOpenChange} />
          </Elements>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Loading payment form…</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StripePaymentDialog;
