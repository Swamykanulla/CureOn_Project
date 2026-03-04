import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, FileText, Microscope, FlaskConical, Mail, Phone, MapPin,
} from "lucide-react";
import AdminLabs from "./AdminLabs";
import { adminService } from "@/services/api";
import { Stethoscope, Users, Pill, Settings as SettingsIcon, Calendar, Building2 } from "lucide-react";
import { Wallet } from "lucide-react";

const staticTests = [
  { id: "T-001", name: "Complete Blood Count (CBC)", code: "CBC", price: "$25.00", turnaround: "24 hrs" },
  { id: "T-002", name: "Lipid Profile", code: "LIPID", price: "$45.00", turnaround: "24 hrs" },
  { id: "T-003", name: "Genetic Screening", code: "GEN-S", price: "$250.00", turnaround: "5-7 days" },
];

const getStatusBadge = (status) => {
  switch (status) {
    case "OPERATIONAL": return "bg-green-100 text-green-800";
    case "MAINTENANCE": return "bg-yellow-100 text-yellow-800";
    case "CALIBRATING": return "bg-blue-100 text-blue-800";
    case "REPORTED": return "bg-orange-100 text-orange-800";
    case "BROKEN": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const AdminLabDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);

  const navItems = useMemo(() => ([
    { name: "Dashboard", href: "/admin/dashboard", icon: Stethoscope },
    { name: "Doctors", href: "/admin/doctors", icon: Users },
    { name: "Patients", href: "/admin/patients", icon: Users },
    { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
    { name: "Labs", href: "/admin/labs", icon: Building2 },
    { name: "Payments", href: "/admin/payments", icon: Wallet },
    { name: "Settings", href: "/admin/settings", icon: SettingsIcon },
  ]), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const labRes = await adminService.getLabDetail(Number(id));
        if (!active) return;
        setLab(labRes);
      } catch {
        setLab(null);
      } finally {
        setLoading(false);
      }
      try {
        const { equipmentService } = await import("@/services/api");
        const eq = await equipmentService.list({ labId: Number(id) });
        if (!active) return;
        setEquipment(eq || []);
      } catch {
        setEquipment([]);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (!lab) {
    return (
      <DashboardLayout navItems={navItems} userType="admin">
        <div className="p-6">
          <Button variant="ghost" className="w-fit -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/admin/labs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Labs
          </Button>
          <div className="dashboard-card p-8 mt-4">Loading lab details…</div>
        </div>
      </DashboardLayout>
    );
  }

  const labName = (lab.first_name || lab.last_name) ? `${lab.first_name || ""} ${lab.last_name || ""}`.trim() : (lab.username || "Lab");
  const labStatus = "active";
  const labLicense = lab?.license_number || lab?.lab_profile?.license_number || "LB-00000";
  const labEmail = lab.email || "not-provided@example.com";
  const labPhone = lab?.phone || lab?.lab_profile?.phone || "N/A";
  const labAddress = lab?.address || lab?.lab_profile?.address || "N/A";
  const totalRequests = Array.isArray(lab?.lab_requests) ? lab.lab_requests.length : 0;
  const pendingRequests = Array.isArray(lab?.lab_requests) ? lab.lab_requests.filter((r)=>String(r.status).toUpperCase()==="PENDING").length : 0;

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <Button variant="ghost" className="w-fit -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate("/admin/labs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Labs
          </Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {labName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display text-foreground">{labName}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <FileText className="w-4 h-4" />
                  <span>License: {labLicense}</span>
                  <span className="mx-2">•</span>
                  <Badge variant={labStatus === 'active' ? 'success' : 'warning'} className="capitalize">{labStatus}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline"><Mail className="w-4 h-4 mr-2" />Contact Lab</Button>
              <Button variant="default">Edit Details</Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="tests">Test Menu</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalRequests}</div><p className="text-xs text-muted-foreground mt-1">All time received</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{pendingRequests}</div><p className="text-xs text-muted-foreground mt-1">Awaiting processing</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Equipment Count</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{equipment.length}</div><p className="text-xs text-muted-foreground mt-1">Registered devices</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Mail className="w-4 h-4 text-muted-foreground" /></div><div><p className="text-sm font-medium">Email Address</p><p className="text-sm text-muted-foreground">{labEmail}</p></div></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Phone className="w-4 h-4 text-muted-foreground" /></div><div><p className="text-sm font-medium">Phone Number</p><p className="text-sm text-muted-foreground">{labPhone}</p></div></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><MapPin className="w-4 h-4 text-muted-foreground" /></div><div><p className="text-sm font-medium">Address</p><p className="text-sm text-muted-foreground">{labAddress}</p></div></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>About Lab</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground leading-relaxed">{lab?.description || "Diagnostic laboratory."}</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Microscope className="w-5 h-5 text-primary" />Lab Equipment</CardTitle>
                <CardDescription>List of registered equipment and their current status.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Equipment Name</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Last Maintenance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {equipment.length > 0 ? equipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.model}</TableCell>
                        <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>{item.status}</span></TableCell>
                        <TableCell>{item.last_maintenance || "-"}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No equipment registered for this lab.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary" />Available Tests</CardTitle>
                <CardDescription>List of diagnostic tests offered by this laboratory.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Test Name</TableHead><TableHead>Code</TableHead><TableHead>Price</TableHead><TableHead>Turnaround Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {staticTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.name}</TableCell>
                        <TableCell className="font-mono text-xs">{test.code}</TableCell>
                        <TableCell>{test.price}</TableCell>
                        <TableCell className="text-muted-foreground">{test.turnaround}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminLabDetails;
