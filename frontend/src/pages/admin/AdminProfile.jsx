import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  User,
  Camera,
  Save,
  Shield,
  Users,
  Pill,
  FlaskConical,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { profileService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminProfile = () => {
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await profileService.admin.get();
        setFormData({
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
          email: data.email || "",
          role: data.role,
          phone: data.phone || "",
        });
      } catch {}
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const updated = await profileService.avatar.upload(file);
      setFormData(prev => ({ ...prev, avatar: updated.avatar }));
      toast.success("Profile image updated");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const [firstName, ...rest] = (formData.name || "").split(" ");
      const lastName = rest.join(" ");
      await profileService.admin.update({
        first_name: firstName || "",
        last_name: lastName || "",
        email: formData.email || "",
      });
      toast.success("Profile updated successfully");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Admin Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your administrator account details</p>
        </div>

        {/* Profile Header & Image */}
        <div className="dashboard-card p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-xl">
              {formData.avatar ? (
                <img src={buildAvatarUrl(formData.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="text-center sm:text-left space-y-2 flex-1">
            <h2 className="text-2xl font-bold">{formData.name}</h2>
            <p className="text-muted-foreground">Role: {formData.role}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Full Access</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">System Manager</span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Personal Information</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input name="phone" value={formData.phone || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={formData.employeeId || ''} disabled />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminProfile;
