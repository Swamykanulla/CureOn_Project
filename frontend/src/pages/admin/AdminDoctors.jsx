import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddDoctorModal from "@/components/admin/AddDoctorModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  Search,
  Mail,
  Phone,
  MoreVertical,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  Pill,
  FlaskConical,
  Wallet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userService, appointmentsService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const specializations = [
  "General Physician",
  "Cardiologist",
  "Neurologist",
  "Orthopedic",
  "Dermatologist",
  "Pediatrician",
  "Ophthalmologist",
  "Psychiatrist",
  "ENT Specialist",
  "Gynecologist",
  "Urologist",
];

const AdminDoctors = () => {
  const [addDoctorModalOpen, setAddDoctorModalOpen] = useState(false);
  const [editDoctorModalOpen, setEditDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  const loadDoctors = async () => {
    try {
      const [users, appts] = await Promise.all([
        userService.list("DOCTOR"),
        appointmentsService.adminAll(),
      ]);
      const patientSets = {};
      (appts || []).forEach((a) => {
        if (a.status === "COMPLETED") {
          const d = a.doctor;
          const p = a.patient;
          if (!patientSets[d]) patientSets[d] = new Set();
          patientSets[d].add(p);
        }
      });
      const mapped = users.map((u) => ({
        id: String(u.id),
        name: (u.first_name || u.last_name) ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || `Dr. ${u.username}` : `Dr. ${u.username}`,
        specialty: u.specialization || "",
        email: u.email || "",
        phone: u.phone || "",
        status: u.is_active ? "active" : "inactive",
        patients: patientSets[u.id]?.size || 0,
        avatar: buildAvatarUrl(u.avatar),
      }));
      setDoctors(mapped);
    } catch (e) {
      console.error("Failed to load doctors", e);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);
  useEffect(() => {
    if (!addDoctorModalOpen) loadDoctors();
  }, [addDoctorModalOpen]);

  const handleDoctorAdded = async () => {
    // Data is created in modal; reload list on close effect
  };

  const handleEditClick = (doctor) => {
    setEditingDoctor(doctor);
    setEditDoctorModalOpen(true);
  };

  const handleDeleteClick = async (doctorId) => {
    try {
      await userService.delete(doctorId);
      await loadDoctors();
    } catch (e) {
      console.error("Failed to delete doctor", e);
    }
  };

  const handleEditSave = async () => {
    if (editingDoctor) {
      try {
        const name = editingDoctor.name || "";
        const [first_name, ...rest] = name.split(" ");
        const payload = {
          first_name,
          last_name: rest.join(" "),
          email: editingDoctor.email,
          phone: editingDoctor.phone,
          specialization: editingDoctor.specialty,
        };
        await userService.update(editingDoctor.id, payload);
        setEditDoctorModalOpen(false);
        setEditingDoctor(null);
        await loadDoctors();
      } catch (e) {
        console.error("Failed to update doctor", e);
      }
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Doctors</h1>
            <p className="text-muted-foreground mt-1">Manage registered doctors</p>
          </div>
          <Button variant="hero" onClick={() => setAddDoctorModalOpen(true)}>
            <UserPlus className="w-5 h-5" />
            Add Doctor
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchTerm ? doctors.filter(d => {
            const q = searchTerm.trim().toLowerCase();
            return (
              d.name.toLowerCase().includes(q) ||
              d.specialty.toLowerCase().includes(q) ||
              d.email.toLowerCase().includes(q) ||
              d.phone.toLowerCase().includes(q)
            );
          }) : doctors).map((doctor) => (
            <div 
              key={doctor.id} 
              className="dashboard-card relative hover:shadow-lg transition-all group"
            >
              <Link to={`/admin/doctors/${doctor.id}`} className="block p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                      {doctor.avatar ? (
                        <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-semibold text-lg">{doctor.name.split(" ")[1]?.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{doctor.name}</h3>
                      <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{doctor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{doctor.phone}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className={`badge-status ${doctor.status === "active" ? "badge-success" : "badge-warning"} capitalize`}>{doctor.status}</span>
                  <span className="text-sm text-muted-foreground">{doctor.patients} patients</span>
                </div>
              </Link>
              
              <div className="absolute top-5 right-5 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-2 rounded-lg hover:bg-secondary">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClick(doctor)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(doctor.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Doctor Modal */}
      <AddDoctorModal
        open={addDoctorModalOpen}
        onOpenChange={setAddDoctorModalOpen}
        onDoctorAdded={handleDoctorAdded}
      />

      {/* Edit Doctor Modal */}
      <Dialog open={editDoctorModalOpen} onOpenChange={setEditDoctorModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Doctor
            </DialogTitle>
          </DialogHeader>
          {editingDoctor && (
            <div className="py-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Doctor Name</Label>
                <Input
                  id="edit-name"
                  value={editingDoctor.name}
                  onChange={(e) => setEditingDoctor({ ...editingDoctor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-specialty">Specialization</Label>
                <Select
                  value={editingDoctor.specialty}
                  onValueChange={(value) => setEditingDoctor({ ...editingDoctor, specialty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingDoctor.email}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editingDoctor.phone}
                    onChange={(e) => setEditingDoctor({ ...editingDoctor, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditDoctorModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="hero" onClick={handleEditSave} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDoctors;
