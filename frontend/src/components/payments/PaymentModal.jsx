import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PaymentModal = ({
  open,
  onOpenChange,
  onContinue,
  qrImageSrc = "/payment-qr.svg",
  paymentStatus,
  transactionId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan and Complete Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {paymentStatus && (
            <div className="rounded-md border p-3 text-sm bg-secondary/20">
              <div className="font-medium">Current Payment Status: {paymentStatus}</div>
              {transactionId && (
                <div className="text-muted-foreground mt-1">Last Transaction ID: {transactionId}</div>
              )}
            </div>
          )}
          <div className="rounded-lg border p-3 bg-white">
            <img
              src={qrImageSrc}
              alt="Payment QR"
              className="w-full max-w-[260px] mx-auto h-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground">Scan and Complete Payment</p>
          <Button className="w-full" variant="hero" onClick={onContinue}>
            I Have Completed Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
