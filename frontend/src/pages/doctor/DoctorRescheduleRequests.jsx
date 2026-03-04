import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorRescheduleRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapType = (t) => (t === "IN_PERSON" ? "in-person" : "video");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { appointmentsService } = await import("@/services/api");
      const res = await appointmentsService.doctorAppointments("RESCHEDULE_REQUESTED");
      const items = (res || []).map((a) => ({
        id: a.id,
        patientName: a.patient_name || "Patient",
        date: format(new Date(a.date), "PP"),
        rawDate: new Date(a.date),
        time: a.time_slot,
        type: mapType(a.visit_type),
        requestedDate: a.requested_date ? format(new Date(a.requested_date), "PP") : null,
        requestedTime: a.requested_time_slot || null,
      }));
      setRequests(items);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDecision = async (appointmentId, decision) => {
    try {
      const { appointmentsService } = await import("@/services/api");
      await appointmentsService.doctorRescheduleDecision(appointmentId, decision);
      if (decision === "ACCEPT") {
        toast.success("Reschedule accepted");
      } else {
        toast.error("Reschedule rejected");
      }
      loadRequests();
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="doctor">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Reschedule Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and respond to patient reschedule requests
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <div className="dashboard-card p-6">Loading...</div>}
          {!loading && requests.length === 0 && (
            <div className="dashboard-card p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No reschedule requests</h3>
            </div>
          )}
          {!loading &&
            requests.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                {...appointment}
                userType="doctor"
                showActions={false}
                customActions={
                  <>
                    <div className="text-xs text-muted-foreground mr-4">
                      Requested: {appointment.requestedDate || "-"}{" "}
                      {appointment.requestedTime ? `at ${appointment.requestedTime}` : ""}
                    </div>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => handleDecision(appointment.id, "ACCEPT")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={() => handleDecision(appointment.id, "REJECT")}
                    >
                      Reject
                    </Button>
                  </>
                }
              />
            ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorRescheduleRequests;

