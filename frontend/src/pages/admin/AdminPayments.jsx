import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FlaskConical, LayoutDashboard, Pill, Settings, Stethoscope, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { paymentsService } from "@/services/payments";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.adminList();
      setPayments(data || []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load payments.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleAction = async (paymentId, action) => {
    setProcessingId(paymentId);
    try {
      if (action === "approve") {
        await paymentsService.approve(paymentId);
        toast.success("Payment approved.");
      } else {
        await paymentsService.reject(paymentId);
        toast.success("Payment rejected.");
      }
      await loadPayments();
    } catch (error) {
      const data = error?.response?.data;
      const message =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        "Failed to update payment status.";
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Review and approve manual payments</p>
        </div>

        <div className="dashboard-card overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-3">User</th>
                <th className="p-3">Appointment</th>
                <th className="p-3">Transaction ID</th>
                <th className="p-3">Screenshot</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && payments.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No payment submissions found.
                  </td>
                </tr>
              )}
              {payments.map((payment) => {
                const isPending = payment.status === "Pending";
                const busy = processingId === payment.id;
                return (
                  <tr className="border-b last:border-b-0" key={payment.id}>
                    <td className="p-3">{payment.user_name || payment.user}</td>
                    <td className="p-3">{payment.appointment_label || payment.appointment}</td>
                    <td className="p-3">{payment.transaction_id}</td>
                    <td className="p-3">
                      {payment.screenshot_url ? (
                        <a
                          className="text-primary underline"
                          href={payment.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="p-3">{payment.status}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(payment.id, "approve")}
                          disabled={!isPending || busy}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(payment.id, "reject")}
                          disabled={!isPending || busy}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
