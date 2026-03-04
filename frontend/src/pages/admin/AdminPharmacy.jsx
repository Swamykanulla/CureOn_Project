import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddPharmacyModal from "@/components/admin/AddPharmacyModal";
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
  MapPin,
  FileText,
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
import { userService, adminService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminPharmacy = () => {
  const [addPharmacyModalOpen, setAddPharmacyModalOpen] = useState(false);
  const [editPharmacyModalOpen, setEditPharmacyModalOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadPharmacies = async () => {
    try {
      const data = await adminService.listPharmaciesAdmin();
      const mapped = (data || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        code: p.code,
        status: (p.status || "Inactive").toLowerCase(),
        total_orders: p.total_orders || 0,
        email: p.email || "",
        phone: p.phone || "",
      }));
      setPharmacies(mapped);
    } catch (e) {
      console.error("Failed to load pharmacies", e);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);
  useEffect(() => {
    if (!addPharmacyModalOpen) loadPharmacies();
  }, [addPharmacyModalOpen]);

  const handlePharmacyAdded = () => {};

  const handleEditClick = (pharmacy) => {
    setEditingPharmacy(pharmacy);
    setEditPharmacyModalOpen(true);
  };

  const handleDeleteClick = async (pharmacyId) => {
    try {
      await userService.delete(pharmacyId);
      await loadPharmacies();
    } catch (e) {
      console.error("Failed to delete pharmacy", e);
    }
  };

  const handleEditSave = async () => {
    if (editingPharmacy) {
      try {
        const name = editingPharmacy.name || "";
        const [first_name, ...rest] = name.split(" ");
        const payload = {
          first_name,
          last_name: rest.join(" "),
          email: editingPharmacy.email,
          phone: editingPharmacy.phone,
          address: editingPharmacy.address,
          license_number: editingPharmacy.license,
        };
        await userService.update(editingPharmacy.id, payload);
        setEditPharmacyModalOpen(false);
        setEditingPharmacy(null);
        await loadPharmacies();
      } catch (e) {
        console.error("Failed to update pharmacy", e);
      }
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Pharmacy</h1>
            <p className="text-muted-foreground mt-1">Manage registered pharmacies</p>
          </div>
          <Button variant="hero" onClick={() => setAddPharmacyModalOpen(true)}>
            <UserPlus className="w-5 h-5" />
            Add Pharmacy
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pharmacies..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchTerm ? pharmacies.filter(ph => {
            const q = searchTerm.trim().toLowerCase();
            return (
              ph.name.toLowerCase().includes(q) ||
              String(ph.code || "").toLowerCase().includes(q) ||
              ph.email.toLowerCase().includes(q) ||
              ph.phone.toLowerCase().includes(q) ||
              String(ph.address || "").toLowerCase().includes(q)
            );
          }) : pharmacies).map((pharmacy) => (
            <Link
              key={pharmacy.id}
              to={`/admin/pharmacies/${pharmacy.id}`}
              className="dashboard-card relative hover:shadow-lg transition-all group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">{pharmacy.name.split(" ")[0]?.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{pharmacy.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>{pharmacy.code}</span>
                        <span className={`badge-status ${pharmacy.status === "active" ? "badge-success" : "badge-warning"} capitalize ml-2`}>{pharmacy.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Total Orders</div>
                    <div className="text-2xl font-bold text-foreground">{pharmacy.total_orders}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{pharmacy.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{pharmacy.phone}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Add Pharmacy Modal */}
      <AddPharmacyModal
        open={addPharmacyModalOpen}
        onOpenChange={setAddPharmacyModalOpen}
        onPharmacyAdded={handlePharmacyAdded}
      />

      {/* Edit Pharmacy Modal */}
      <Dialog open={editPharmacyModalOpen} onOpenChange={setEditPharmacyModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Pharmacy
            </DialogTitle>
          </DialogHeader>
          {editingPharmacy && (
            <div className="py-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Pharmacy Name</Label>
                <Input
                  id="edit-name"
                  value={editingPharmacy.name}
                  onChange={(e) => setEditingPharmacy({ ...editingPharmacy, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input
                  id="edit-license"
                  value={editingPharmacy.license}
                  onChange={(e) => setEditingPharmacy({ ...editingPharmacy, license: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingPharmacy.email}
                    onChange={(e) => setEditingPharmacy({ ...editingPharmacy, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editingPharmacy.phone}
                    onChange={(e) => setEditingPharmacy({ ...editingPharmacy, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingPharmacy.address}
                  onChange={(e) => setEditingPharmacy({ ...editingPharmacy, address: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditPharmacyModalOpen(false)} className="flex-1">
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

export default AdminPharmacy;
