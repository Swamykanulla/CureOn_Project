import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { useUser } from "@/context/UserContext";
import { LayoutDashboard, Users, Calendar, Settings, Stethoscope, CheckCircle2, Clock, XCircle, AlertTriangle, Pill, FlaskConical, AlertOctagon, Package, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { userService, appointmentsService, equipmentService, adminService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminDashboard = () => {
  const { user } = useUser();
  const [users, setUsers] = useState([]);
  const [appts, setAppts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, a, eqAll] = await Promise.all([
          userService.list(),
          appointmentsService.adminAll(),
          equipmentService.list(), // all equipment (admin can see all)
        ]);
        setUsers(u || []);
        setAppts(a || []);
        const labsById = {};
        (u || []).forEach((x) => { if (x.role === "LAB") labsById[x.id] = (x.first_name || x.last_name) ? `${x.first_name || ""} ${x.last_name || ""}`.trim() || x.username : x.username; });
        const today = new Date().toISOString().slice(0,10);
        const items = (eqAll || []).map((e) => {
          const labName = labsById[e.lab];
          if (!labName) return null; // skip equipment not associated with a known lab
          const status = String(e.status || "").toUpperCase();
          let severity = null;
          let title = e.name || "Equipment";
          let desc = "";
          if (status === "BROKEN") {
            severity = "critical";
            desc = `${e.issue_type || "Issue"} - ${labName}`;
          } else if (status === "MAINTENANCE" || status === "CALIBRATING") {
            severity = "warning";
            const overdue = e.next_maintenance && String(e.next_maintenance) < today;
            desc = overdue ? `Maintenance overdue - ${labName}` : `Calibration in progress - ${labName}`;
          } else if (status === "REPORTED") {
            severity = "reported";
            desc = `${e.issue_description || e.issue_type || "Issue reported"} - ${labName}`;
          }
          return severity ? { id: e.id, name: title, severity, desc } : null;
        }).filter(Boolean);
        // show all issues
        setIssues(items);

        // Stock alerts across pharmacies (low stock, expired, out of stock)
        const pharmacies = await adminService.listPharmaciesAdmin();
        const todayStr = new Date().toISOString().slice(0, 10);
        const alerts = [];
        for (const ph of pharmacies || []) {
          try {
            const inv = await adminService.getPharmacyInventory(ph.id);
            const itemsInv = inv?.items || [];
            for (const it of itemsInv) {
              const exp = it.expiry ? String(it.expiry) : null;
              const isExpired = exp && exp < todayStr;
              const isOut = Number(it.stock || 0) <= 0;
              const isLow = !isOut && Number(it.stock || 0) < Number(it.min_stock || 0);
              if (isExpired || isOut || isLow) {
                let type = "LOW_STOCK";
                if (isExpired) type = "EXPIRED";
                else if (isOut) type = "OUT_OF_STOCK";
                alerts.push({
                  id: `${ph.id}-${it.id}`,
                  name: it.name,
                  pharmacy: ph.name,
                  type,
                });
              }
            }
          } catch (e) {
            // ignore pharmacy fetch errors
          }
        }
        // Keep top 6 alerts for brevity
        setStockAlerts(alerts.slice(0, 6));
      } catch {
        setUsers([]);
        setAppts([]);
        setIssues([]);
        setStockAlerts([]);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const totalUsers = users.length;
    const activeDoctors = (users || []).filter((u) => u.role === "DOCTOR" && u.is_active).length;
    const totalAppointments = appts.length;
    return { totalUsers, activeDoctors, totalAppointments };
  }, [users, appts]);

  const appointmentStats = useMemo(() => {
    const completed = (appts || []).filter((a) => a.status === "COMPLETED").length;
    const pending = (appts || []).filter((a) => a.status === "UPCOMING").length;
    const cancelled = (appts || []).filter((a) => a.status === "CANCELLED").length;
    return [
      { label: "Completed", value: completed, icon: CheckCircle2, color: "text-success" },
      { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
      { label: "Cancelled", value: cancelled, icon: XCircle, color: "text-destructive" },
    ];
  }, [appts]);

  const quickSummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const newPatientsToday = (users || []).filter((u) => u.role === "PATIENT" && (u.date_joined || "").slice(0, 10) === today).length;
    const activeConsultations = (appts || []).filter((a) => a.status === "UPCOMING" && (a.date || "") === today).length;
    const pendingVerifications = (users || []).filter((u) => !u.is_active).length;
    const systemHealth = "Good";
    return { newPatientsToday, activeConsultations, pendingVerifications, systemHealth };
  }, [users, appts]);

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">{user?.first_name || user?.username || "Admin"} 🛡️</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Main Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <StatCard title="Total Users" value={totals.totalUsers} icon={Users} iconColor="text-primary" iconBg="bg-primary/10" />
          <StatCard title="Active Doctors" value={totals.activeDoctors} icon={Stethoscope} iconColor="text-success" iconBg="bg-success/10" />
          <StatCard title="Total Appointments" value={totals.totalAppointments} icon={Calendar} iconColor="text-accent" iconBg="bg-accent/10" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Appointment Overview</h2>
              <div className="dashboard-card p-5 space-y-4">
                {appointmentStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <span className="text-foreground">{stat.label}</span>
                    </div>
                    <span className="font-semibold text-foreground">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Quick Summary</h2>
              <div className="dashboard-card p-5 space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-foreground">New patients today</span>
                  <span className="font-semibold text-primary">{quickSummary.newPatientsToday}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/10">
                  <span className="text-foreground">Active consultations</span>
                  <span className="font-semibold text-success">{quickSummary.activeConsultations}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/10">
                  <span className="text-foreground">Pending verifications</span>
                  <span className="font-semibold text-warning">{quickSummary.pendingVerifications}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/10">
                  <span className="text-foreground">System health</span>
                  <span className="font-semibold text-accent">{quickSummary.systemHealth}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Lab Equipment Issues</h2>
              <div className="dashboard-card p-5 space-y-4">
                {issues.map((it) => (
                  <div
                    key={it.id}
                    className={`flex items-start justify-between p-3 rounded-xl ${
                      it.severity === "critical"
                        ? "bg-destructive/5 border border-destructive/10"
                        : it.severity === "warning"
                        ? "bg-warning/5 border border-warning/10"
                        : "bg-secondary/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{it.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            it.severity === "critical"
                              ? "bg-destructive/10 text-destructive"
                              : it.severity === "warning"
                              ? "bg-warning/10 text-warning-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {it.severity === "critical" ? "Critical" : it.severity === "warning" ? "Warning" : "Reported"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{it.desc}</p>
                    </div>
                    <AlertTriangle
                      className={`w-5 h-5 mt-1 ${
                        it.severity === "critical"
                          ? "text-destructive"
                          : it.severity === "warning"
                          ? "text-warning"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                ))}
                {issues.length === 0 && (
                  <div className="text-sm text-muted-foreground">No current equipment issues.</div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">Stock Alerts</h2>
              <div className="dashboard-card p-5 space-y-4">
                {stockAlerts.map((al) => (
                  <div
                    key={al.id}
                    className={`flex items-start justify-between p-3 rounded-xl ${
                      al.type === "EXPIRED"
                        ? "bg-destructive/5 border border-destructive/10"
                        : al.type === "OUT_OF_STOCK"
                        ? "bg-red-50/50 border border-red-100"
                        : "bg-warning/5 border border-warning/10"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{al.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            al.type === "EXPIRED"
                              ? "bg-destructive/10 text-destructive"
                              : al.type === "OUT_OF_STOCK"
                              ? "bg-red-100 text-red-700"
                              : "bg-warning/10 text-warning-foreground"
                          }`}
                        >
                          {al.type === "EXPIRED" ? "Expired" : al.type === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Pharmacy: {al.pharmacy}</p>
                    </div>
                    {al.type === "EXPIRED" ? (
                      <AlertOctagon className="w-5 h-5 mt-1 text-destructive" />
                    ) : al.type === "OUT_OF_STOCK" ? (
                      <Package className="w-5 h-5 mt-1 text-red-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 mt-1 text-warning" />
                    )}
                  </div>
                ))}
                {stockAlerts.length === 0 && (
                  <div className="text-sm text-muted-foreground">No current stock alerts.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
