import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  Mail,
  Phone,
  ArrowLeft,
  Award,
  Clock,
  MapPin,
  User,
  Users,
  Pill,
  FlaskConical,
  Wallet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const AdminDoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
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
        const data = await adminService.getDoctorDetail(id);
        setDoctor(data);
      } catch (error) {
        console.error("Failed to fetch doctor details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Loading...</div></DashboardLayout>;
  }

  if (!doctor) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Doctor not found</div></DashboardLayout>;
  }

  const name = (doctor.first_name || doctor.last_name) ? `${doctor.first_name} ${doctor.last_name}` : doctor.username;

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/doctors")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Doctor Details</h1>
            <p className="text-muted-foreground">View detailed information and patient history</p>
          </div>
        </div>

        {/* Doctor Profile Card */}
        <div className="dashboard-card p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {doctor.avatar ? (
                <img src={buildAvatarUrl(doctor.avatar)} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-3xl">{name.split(" ")[1]?.charAt(0) || name.charAt(0)}</span>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{name}</h2>
                <p className="text-lg text-muted-foreground font-medium">{doctor.specialization || "General Physician"}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{doctor.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{doctor.phone || "No phone"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span>Patients Treated: {doctor.patients_treated_count || 0}</span>
                </div>
              </div>

              {doctor.about && (
                <div className="pt-2">
                  <h3 className="font-semibold mb-1">About</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{doctor.about}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patients Treated Table */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Appointments History
          </h2>
          
          <div className="dashboard-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctor.appointments && doctor.appointments.length > 0 ? (
                  doctor.appointments.map((appt) => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{appt.patient_name}</TableCell>
                      <TableCell>{appt.date}</TableCell>
                      <TableCell>{appt.time_slot}</TableCell>
                      <TableCell>{appt.visit_type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          appt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 
                          appt.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appt.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No appointments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDoctorDetails;
