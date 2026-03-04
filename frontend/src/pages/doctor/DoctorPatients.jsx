import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PatientHistoryModal from "@/components/doctor/PatientHistoryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  Search,
  FileText,
  Phone,
  Mail,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { appointmentsService } from "@/services/api";

const DoctorPatients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRefs = useRef({});

  const navItems = [
    { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { name: "Patients", href: "/doctor/patients", icon: Users },
    { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
    { name: "Settings", href: "/doctor/settings", icon: Settings },
  ];

  // State for patient files (persistence across modal opens)
  const [patientFiles, setPatientFiles] = useState({});

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await appointmentsService.doctorPatients();
        const items = (res || []).map((p) => ({
          id: String(p.id),
          name: p.name || "Patient",
          email: p.email || "",
          phone: p.phone || "",
          age: p.age || "-",
          condition: p.condition || "-",
          lastVisit: p.last_visit ? new Date(p.last_visit).toLocaleDateString() : "-",
          totalVisits: p.total_visits || 0,
          avatar: buildAvatarUrl(p.avatar),
        }));
        setPatients(items);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleViewHistory = (patient) => {
    setSelectedPatient(patient);
    setHistoryModalOpen(true);
  };

  const handleUploadClick = (patientId) => {
    const input = fileInputRefs.current[patientId];
    if (input) {
      input.click();
    }
  };

  const handleFileUpload = (patientId, event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const patient = patients.find(p => p.id === patientId);
      
      const newFile = {
        id: Date.now(),
        name: file.name,
        type: "Uploaded Document",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        uploadedBy: "Doctor",
      };

      setPatientFiles(prev => ({
        ...prev,
        [patientId]: [...(prev[patientId] || []), newFile]
      }));

      toast.success(`Uploaded ${file.name} for ${patient?.name}`);
    }
    // Reset input
    const input = fileInputRefs.current[patientId];
    if (input) {
      input.value = "";
    }
  };

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(q) ||
      patient.email.toLowerCase().includes(q) ||
      String(patient.condition || "").toLowerCase().includes(q)
    );
  }, [patients, searchTerm]);

  return (
    <DashboardLayout
      navItems={navItems}
      userType="doctor"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Patients
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your patients and view their history
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search patients..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Patients Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
            <div key={patient.id} className="dashboard-card p-5 hover-lift">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {patient.avatar ? (
                    <img
                      src={patient.avatar}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold text-lg">
                      {patient.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{patient.name}</h3>
                  <p className="text-sm text-muted-foreground">{patient.age} {t('doctor.patients.yearsOld')}</p>
                  <span className="badge-status badge-pending mt-1">{patient.condition}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{patient.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm">
                  <p className="text-muted-foreground">{t('doctor.patients.lastVisit')}</p>
                  <p className="font-medium text-foreground">{patient.lastVisit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="hero" size="sm" onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                    View
                  </Button>
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              {t('doctor.patients.noPatientsFound')}
            </div>
          )}
        </div>
      </div>

      {/* Patient History Modal */}
      <PatientHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        patient={selectedPatient}
      />
    </DashboardLayout>
  );
};

export default DoctorPatients;
