import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Activity,
  FileText,
  Pill,
  LayoutDashboard,
  Stethoscope,
  Users,
  FlaskConical,
  Settings,
  Wallet,
} from "lucide-react";
import { adminService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminPatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await adminService.getPatientDetail(id);
        setPatient(data);
      } catch (error) {
        console.error("Failed to fetch patient details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} userType="admin">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout navItems={navItems} userType="admin">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={() => navigate("/admin/patients")}>Back to Patients</Button>
        </div>
      </DashboardLayout>
    );
  }

  const name = (patient.first_name || patient.last_name) ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || patient.username : patient.username;
  const status = patient.is_active ? "active" : "inactive";
  const bloodGroup = patient.blood_type || "-";
  const height = patient.height_cm != null ? `${patient.height_cm} cm` : "-";
  const weight = patient.weight_kg != null ? `${patient.weight_kg} kg` : "-";
  const allergies = patient.allergies || "-";
  const chronicConditions = patient.chronic_diseases || "-";
  const dob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "-";

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/admin/patients")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                {patient.avatar ? (
                  <img src={buildAvatarUrl(patient.avatar)} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-2xl">{name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">{name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <User className="w-4 h-4" />
                  <span>{patient.age || "-"} years • {patient.gender || "-"}</span>
                  <span className="mx-2">•</span>
                  <Badge variant={status === "active" ? "default" : "secondary"}>
                    {status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="visits">Visits History</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
            <TabsTrigger value="reports">Lab Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{dob}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium">{patient.gender || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{bloodGroup}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{patient.phone || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{patient.address || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Medical Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Height</p>
                      <p className="font-medium">{height}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{weight}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Allergies</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-none">
                        {allergies}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                        {chronicConditions}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="visits" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Past Visits ({(patient.appointments || []).length})
                </CardTitle>
                <CardDescription>
                  History of doctor appointments and consultations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(patient.appointments || []).map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{visit.date}</TableCell>
                        <TableCell>{visit.doctor_name}</TableCell>
                        <TableCell>{visit.doctor_specialization || "-"}</TableCell>
                        <TableCell>{visit.visit_type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {visit.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  Prescription History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(patient.prescriptions || []).map((script) => (
                    <div key={script.id} className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{new Date(script.created_at).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">Prescribed by {script.doctor_name}</p>
                        </div>
                        <Badge variant="secondary">{script.status}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Medicines:</p>
                        <ul className="list-disc list-inside text-sm">
                          {(script.items || []).map((it) => (
                            <li key={it.id}>{it.name}{it.dosage ? ` - ${it.dosage}` : ""}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Lab Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Laboratory</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(patient.lab_requests || []).map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{new Date(report.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{(report.tests || []).join(", ")}</TableCell>
                        <TableCell>{report.lab_name || "-"}</TableCell>
                        <TableCell>{report.result_value || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {report.attachment ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={report.attachment} target="_blank" rel="noreferrer">View</a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>View</Button>
                          )}
                        </TableCell>
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

export default AdminPatientDetails;
