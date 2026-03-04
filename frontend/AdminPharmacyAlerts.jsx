import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  Users,
  Pill,
  FlaskConical,
  ArrowLeft,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminPharmacyAlerts = () => {
  const navigate = useNavigate();

  // Mock Alerts Data
  const alerts = [
    {
      id: "ALT-001",
      medicineId: "MED-003",
      name: "Lisinopril 10mg",
      type: "Low Stock",
      message: "Stock level below threshold (45 remaining)",
      severity: "high",
      date: "2024-02-09"
    },
    {
      id: "ALT-002",
      medicineId: "MED-005",
      name: "Atorvastatin 20mg",
      type: "Out of Stock",
      message: "Item is completely out of stock",
      severity: "critical",
      date: "2024-02-08"
    },
    {
      id: "ALT-003",
      medicineId: "MED-012",
      name: "Insulin Glargine",
      type: "Expiring Soon",
      message: "Batch #B892 expires in 15 days",
      severity: "medium",
      date: "2024-02-05"
    }
  ];

  const getSeverityColor = (severity) => {
    switch(severity) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case "critical": return <AlertOctagon className="w-4 h-4" />;
      case "high": return <AlertTriangle className="w-4 h-4" />;
      case "medium": return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/admin/pharmacy")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pharmacy
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Stock Alerts</h1>
              <p className="text-muted-foreground mt-1">Monitor critical inventory issues and expirations</p>
            </div>
            <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10">
              Clear All Alerts
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-red-900">Critical Issues</p>
                        <p className="text-2xl font-bold text-red-700">1</p>
                    </div>
                </div>
            </div>
            <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-orange-900">Low Stock</p>
                        <p className="text-2xl font-bold text-orange-700">1</p>
                    </div>
                </div>
            </div>
            <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/50">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-yellow-900">Expiring Soon</p>
                        <p className="text-2xl font-bold text-yellow-700">1</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert Type</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date Detected</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                        {alert.type}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{alert.name}</div>
                      <div className="text-xs text-muted-foreground">{alert.medicineId}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {alert.message}
                  </TableCell>
                  <TableCell className="text-sm">
                    {alert.date}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/10">
                        Resolve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPharmacyAlerts;
