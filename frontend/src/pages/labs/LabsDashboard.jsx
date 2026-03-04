import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { appointmentsService, equipmentService } from "@/services/api";
import {
  LayoutDashboard,
  FlaskConical,
  TestTube2,
  FileBarChart,
  ClipboardCheck,
  History,
  Settings,
  Activity,
  Microscope,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [reqs, eq, critical] = await Promise.all([
          appointmentsService.lab.listRequests(),
          equipmentService.list(),
          appointmentsService.lab.history.list({ status: ["ABNORMAL", "INFECTION_DETECTED"] }),
        ]);
        setRequests(reqs || []);
        setEquipments(eq || []);
        setCriticalCount((critical || []).length);
      } catch (e) {
        // keep empty on error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingCount = useMemo(
    () => requests.filter(r => ["PENDING", "IN_PROGRESS"].includes(r.status)).length,
    [requests]
  );
  const completedToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return requests.filter(r => r.status === "COMPLETED" && (r.updated_at || r.created_at || "").slice(0,10) === today).length;
  }, [requests]);
  const avgTurnaroundHours = useMemo(() => {
    const completed = requests.filter(r => r.status === "COMPLETED");
    if (!completed.length) return "—";
    const durations = completed.slice(0, 50).map(r => {
      const start = new Date(r.created_at);
      const end = new Date(r.updated_at || r.created_at);
      return Math.max(0, (end - start) / 36e5);
    });
    const avg = durations.reduce((a,b)=>a+b,0) / durations.length;
    return `${avg.toFixed(1)}h`;
  }, [requests]);
  const stats = useMemo(() => ([
    {
      title: "Pending Tests",
      value: String(pendingCount),
      icon: TestTube2,
      description: "Awaiting analysis",
      path: "/labs/requests"
    },
    {
      title: "Completed Today",
      value: String(completedToday),
      icon: CheckCircle2,
      description: "Reports generated",
      path: "/labs/history"
    },
    {
      title: "Critical Results",
      value: String(criticalCount || 0),
      icon: Activity,
      description: "Flagged results",
      path: "/labs/history"
    },
    {
      title: "Avg Turnaround",
      value: avgTurnaroundHours,
      icon: Clock,
      description: "Time to report",
      path: "/labs/history"
    },
  ]), [pendingCount, completedToday, avgTurnaroundHours]);

  const recentRequests = useMemo(() => {
    return (requests || []).slice(0, 5).map(r => ({
      id: r.id,
      patient: r.patient_name || r.patient,
      doctor: r.doctor_name || r.doctor,
      tests: Array.isArray(r.tests) ? r.tests : [],
      priority: r.priority === "URGENT" ? "Urgent" : "Routine",
      status:
        r.status === "PENDING" ? "Pending" :
        r.status === "IN_PROGRESS" ? "In Progress" : "Completed",
      time: new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }));
  }, [requests]);

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Laboratory Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.first_name || user?.username || "Lab Technician"}
            </p>
          </div>
          <Button variant="hero" className="shrink-0" onClick={() => navigate("/labs/results")}>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Enter Results
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              onClick={() => navigate(stat.path)} 
              className="cursor-pointer transition-all hover:shadow-md"
            >
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* Recent Requests & Equipment Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Requests */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-lg">Recent Test Requests</h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/labs/requests")}>
                View All
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {req.patient ? req.patient.charAt(0) : "?"}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {req.patient}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {req.tests.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        {req.priority === "Urgent" && (
                          <span className="text-xs font-bold text-destructive animate-pulse">
                            URGENT
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            req.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : req.status === "In Progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-xs text-muted-foreground mr-2">
                          {req.time}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => navigate("/labs/requests")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Equipment Status */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-lg">Equipment Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(equipments || []).slice(0,6).map((eq) => {
                  const map = {
                    OPERATIONAL: { label: "Operational", color: "text-green-600" },
                    MAINTENANCE: { label: "Maintenance", color: "text-yellow-600" },
                    CALIBRATING: { label: "Calibrating", color: "text-blue-600" },
                    REPORTED: { label: "Reported", color: "text-orange-600" },
                    BROKEN: { label: "Broken", color: "text-red-600" },
                  };
                  const m = map[eq.status] || { label: eq.status, color: "text-muted-foreground" };
                  return (
                  <div key={eq.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Microscope className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium text-sm">{eq.name}</span>
                    </div>
                    <span className={`text-xs font-medium ${m.color}`}>
                      {m.label}
                    </span>
                  </div>
                )})}
                {(!equipments || equipments.length === 0) && (
                  <div className="text-sm text-muted-foreground">No equipment found</div>
                )}
              </div>
              <Button variant="outline" className="w-full mt-6" onClick={() => navigate("/labs/equipment")}>
                Schedule Maintenance
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabsDashboard;
