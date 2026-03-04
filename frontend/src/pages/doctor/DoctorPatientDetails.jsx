import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  User,
  Activity,
  FileText,
  Upload,
  Pill,
  LayoutDashboard,
  Users,
  Clock,
  Settings
} from "lucide-react";
import { appointmentsService } from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorPatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingUploadId, setPendingUploadId] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const history = await appointmentsService.doctorPatientHistory(id);
        setPatientInfo(history.patient || null);
        setPrescriptions(history.prescriptions || []);
        setLabRequests(history.lab_results || []);
        setVisits(history.appointments || []);
      } catch (error) {
        setPatientInfo(null);
        setPrescriptions([]);
        setLabRequests([]);
        setVisits([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const name = patientInfo?.name || "Patient";
  const status = "active";
  const dob = patientInfo?.date_of_birth ? new Date(patientInfo.date_of_birth).toLocaleDateString() : "-";
  const bloodGroup = patientInfo?.blood_type || "-";
  const height = patientInfo?.height_cm != null ? `${patientInfo.height_cm} cm` : "-";
  const weight = patientInfo?.weight_kg != null ? `${patientInfo.weight_kg} kg` : "-";
  const allergies = patientInfo?.allergies || "-";
  const chronicConditions = patientInfo?.chronic_diseases || "-";

  const buildAttachmentUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  const handleSubmitUpload = async () => {
    const file = attachmentFile;
    if (!file) {
      toast.info("Please choose a file");
      return;
    }
    // If a specific request was chosen, use it; else pick first without attachment, otherwise latest
    const target = pendingUploadId
      ? (labRequests || []).find((r) => r.id === pendingUploadId)
      : (labRequests || []).find((r) => !r.attachment);
    if (!target) {
      // no existing request: create ad-hoc report directly for this patient
      try {
        await appointmentsService.lab.doctorUploadAdhoc(id, { attachment: file, clinical_notes: clinicalNotes, result_value: resultValue, reference_range: referenceRange, report_name: reportName });
        const updated = await appointmentsService.doctorPatientHistory(id);
        setLabRequests(updated.lab_results || []);
        toast.success("Report uploaded");
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Failed to upload report");
      } finally {
        setPendingUploadId(null);
        setUploadOpen(false);
        setReportName("");
        setResultValue("");
        setReferenceRange("");
        setClinicalNotes("");
        setAttachmentFile(null);
      }
      return;
    }
    try {
      await appointmentsService.lab.doctorUploadResult(target.id, { attachment: file, clinical_notes: clinicalNotes, result_value: resultValue, reference_range: referenceRange, report_name: reportName });
      const updated = await appointmentsService.doctorPatientHistory(id);
      setLabRequests(updated.lab_results || []);
      toast.success("Report uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to upload report");
    } finally {
      setPendingUploadId(null);
      setUploadOpen(false);
      setReportName("");
      setResultValue("");
      setReferenceRange("");
      setClinicalNotes("");
      setAttachmentFile(null);
    }
  };

  const openUploadFor = (requestId) => {
    setPendingUploadId(requestId || null);
    setUploadOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} userType="doctor">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!patientInfo) {
    return (
      <DashboardLayout navItems={navItems} userType="doctor">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Patient not found</p>
          <Button onClick={() => navigate("/doctor/patients")}>Back to Patients</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userType="doctor">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/doctor/patients")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-background">
                    <AvatarImage src={buildAttachmentUrl(patientInfo?.avatar) || null} alt={name} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        {name}
                        <Badge variant={status === "active" ? "success" : "secondary"}>{status}</Badge>
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        {patientInfo.gender || "-"} • {(patientInfo.age ?? "-")} years • Blood Type: <span className="font-medium text-foreground">{bloodGroup}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      <Button variant="outline">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{patientInfo.phone || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{patientInfo.email || "-"}</p>
                      </div>
                    </div>
                    
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium truncate">{patientInfo.address || "-"}</p>
                      </div>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                      <p className="font-medium">{patientInfo.gender || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{patientInfo.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{patientInfo.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Group</p>
                      <p className="font-medium">{bloodGroup}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{patientInfo?.address || "-"}</p>
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
                  Past Visits ({(visits || []).length})
                </CardTitle>
                <CardDescription>
                  History of appointments with this patient
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
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(visits || []).map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{visit.date}</TableCell>
                        <TableCell>{visit.doctor_name || "-"}</TableCell>
                        <TableCell>{visit.doctor_specialization || "-"}</TableCell>
                        <TableCell>{visit.visit_type}</TableCell>
                        <TableCell>{visit.diagnosis || "-"}</TableCell>
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
                  {(prescriptions || []).map((script) => (
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Medical Records & Reports</CardTitle>
                  <CardDescription>Lab results, imaging, and other documents</CardDescription>
                </div>
                <div>
                  <Button onClick={() => openUploadFor(((labRequests || []).find(r => !r.attachment) || (labRequests || [])[0])?.id || null)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(labRequests || []).map((report) => {
                    const url = buildAttachmentUrl(report.attachment);
                    const notes = String(report.clinical_notes || "");
                    const m = notes.match(/\[REPORT_NAME:(.+?)\]/);
                    const name = m ? m[1] : (Array.isArray(report.tests) ? report.tests.join(", ") : "Lab Report");
                    const uploadedBy = report.uploaded_by ? `Uploaded by ${report.uploaded_by}` : "Not uploaded";
                    const askedBy = report.uploaded_by === "Patient" ? "" : (report.doctor_name ? `Asked by ${report.doctor_name}` : "");
                    return (
                      <div key={report.id} className="p-4 rounded-lg border border-border bg-card/50 flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{name}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span>Lab Report</span>
                              <span>•</span>
                              <span>{new Date(report.created_at).toLocaleDateString()}</span>
                              {askedBy && (
                                <>
                                  <span>•</span>
                                  <span>{askedBy}</span>
                                </>
                              )}
                              {uploadedBy && (
                                <>
                                  <span>•</span>
                                  <span>{uploadedBy}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={url} target="_blank" rel="noreferrer">View</a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUploadFor(report.id)}
                            >
                              Upload
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Test Results</DialogTitle>
              <DialogDescription>Record findings and attach a file/image</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Report Name</Label>
                  <Input placeholder="e.g. CBC Report" value={reportName} onChange={(e) => setReportName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">Reference Range</Label>
                  <Input placeholder="Normal" value={referenceRange} onChange={(e) => setReferenceRange(e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">Result Value</Label>
                  <Input placeholder="e.g. 12.5 g/dL" value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-sm">Clinical Notes / Comments</Label>
                <Textarea placeholder="Enter any observations or notes..." value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Attach File/Image</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitUpload}>Submit Results</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DoctorPatientDetails;
