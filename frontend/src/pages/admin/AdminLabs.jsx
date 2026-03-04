import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AddLabModal from "@/components/admin/AddLabModal";
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
import { userService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminLabs = () => {
  const [addLabModalOpen, setAddLabModalOpen] = useState(false);
  const [editLabModalOpen, setEditLabModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labs, setLabs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadLabs = async () => {
    try {
      const data = await userService.list("LAB");
      // Enrich each lab with dynamic request counts via admin lab detail
      const mapped = await Promise.all(
        (data || []).map(async (u) => {
          let reqs = 0;
          let pending = 0;
          try {
            const { adminService } = await import("@/services/api");
            const detail = await adminService.getLabDetail(u.id);
            const list = Array.isArray(detail?.lab_requests) ? detail.lab_requests : [];
            reqs = list.length;
            pending = list.filter((r) => String(r.status).toUpperCase() === "PENDING").length;
          } catch {}
          return {
            id: String(u.id),
            name: (u.first_name || u.last_name)
              ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username
              : u.username,
            license: u.license_number || "",
            email: u.email || "",
            phone: u.phone || "",
            address: u.address || "",
            status: u.is_active ? "active" : "inactive",
            requests: pending || reqs || 0,
          };
        })
      );
      setLabs(mapped);
    } catch (e) {
      console.error("Failed to load labs", e);
    }
  };

  useEffect(() => {
    loadLabs();
  }, []);
  useEffect(() => {
    if (!addLabModalOpen) loadLabs();
  }, [addLabModalOpen]);

  const handleLabAdded = () => {};

  const handleEditClick = (lab) => {
    setEditingLab(lab);
    setEditLabModalOpen(true);
  };

  const handleDeleteClick = async (labId) => {
    try {
      await userService.delete(labId);
      await loadLabs();
    } catch (e) {
      console.error("Failed to delete lab", e);
    }
  };

  const handleEditSave = async () => {
    if (editingLab) {
      try {
        const name = editingLab.name || "";
        const [first_name, ...rest] = name.split(" ");
        const payload = {
          first_name,
          last_name: rest.join(" "),
          email: editingLab.email,
          phone: editingLab.phone,
          address: editingLab.address,
          license_number: editingLab.license,
        };
        await userService.update(editingLab.id, payload);
        setEditLabModalOpen(false);
        setEditingLab(null);
        await loadLabs();
      } catch (e) {
        console.error("Failed to update lab", e);
      }
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Labs</h1>
            <p className="text-muted-foreground mt-1">Manage registered laboratories</p>
          </div>
          <Button variant="hero" onClick={() => setAddLabModalOpen(true)}>
            <UserPlus className="w-5 h-5" />
            Add Lab
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search labs..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchTerm ? labs.filter(l => {
            const q = searchTerm.trim().toLowerCase();
            return (
              l.name.toLowerCase().includes(q) ||
              l.license.toLowerCase().includes(q) ||
              l.email.toLowerCase().includes(q) ||
              l.phone.toLowerCase().includes(q) ||
              String(l.address || "").toLowerCase().includes(q)
            );
          }) : labs).map((lab) => (
            <Link 
              key={lab.id}
              to={`/admin/labs/${lab.id}`}
              className="dashboard-card relative hover:shadow-lg transition-all group"
            >
              <div className="block p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">{lab.name.split(" ")[0]?.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{lab.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        <span>{lab.license}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{lab.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{lab.phone}</span>
                  </div>
                  {lab.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{lab.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className={`badge-status ${lab.status === "active" ? "badge-success" : "badge-warning"} capitalize`}>{lab.status}</span>
                  <span className="text-sm text-muted-foreground">{lab.requests} requests</span>
                </div>
              </div>
              
              <div className="absolute top-5 right-5 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-2 rounded-lg hover:bg-secondary">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditClick(lab)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(lab.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Add Lab Modal */}
      <AddLabModal
        open={addLabModalOpen}
        onOpenChange={setAddLabModalOpen}
        onLabAdded={handleLabAdded}
      />

      {/* Edit Lab Modal */}
      <Dialog open={editLabModalOpen} onOpenChange={setEditLabModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Lab
            </DialogTitle>
          </DialogHeader>
          {editingLab && (
            <div className="py-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Lab Name</Label>
                <Input
                  id="edit-name"
                  value={editingLab.name}
                  onChange={(e) => setEditingLab({ ...editingLab, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input
                  id="edit-license"
                  value={editingLab.license}
                  onChange={(e) => setEditingLab({ ...editingLab, license: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingLab.email}
                    onChange={(e) => setEditingLab({ ...editingLab, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={editingLab.phone}
                    onChange={(e) => setEditingLab({ ...editingLab, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editingLab.address}
                  onChange={(e) => setEditingLab({ ...editingLab, address: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditLabModalOpen(false)} className="flex-1">
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

export default AdminLabs;
