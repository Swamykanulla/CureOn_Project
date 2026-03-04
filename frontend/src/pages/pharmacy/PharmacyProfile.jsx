import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  User,
  Camera,
  Save,
  Store,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { profileService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacyProfile = () => {
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await profileService.pharmacy.get();
        setFormData({
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
          email: data.email || "",
          phone: data.phone || "",
          license: data.license_number || "",
          address: data.address || "",
          avatar: data.avatar || null,
        });
      } catch (e) {
        // ignore
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const payload = {
        first_name: firstName || "",
        last_name: lastName || "",
        email: formData.email || "",
        phone: formData.phone || "",
        license_number: formData.license || "",
        address: formData.address || "",
      };
      await profileService.pharmacy.update(payload);
      setLoading(false);
      toast.success("Profile updated successfully");
    } catch {
      setLoading(false);
      toast.error("Something went wrong");
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Pharmacy Profile</h1>
          <p className="text-muted-foreground mt-1">Manage pharmacy details and public information</p>
        </div>

        {/* Profile Header & Image */}
        <div className="dashboard-card p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-background shadow-xl">
              {formData.avatar ? (
                <img src={buildAvatarUrl(formData.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-16 h-16 text-muted-foreground" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          <div className="text-center sm:text-left space-y-2 flex-1">
            <h2 className="text-2xl font-bold">{formData.name || "Central Pharmacy"}</h2>
            <p className="text-muted-foreground">{formData.license || "License: PH-12345"} | {formData.address || "Main Street"}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Verified Pharmacy</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">24/7 Open</span>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Business Details</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pharmacy Name</Label>
              <Input name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input name="license" value={formData.license || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Registration Date</Label>
              <Input type="date" name="registrationDate" value={formData.registrationDate || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Manager Name</Label>
              <Input name="managerName" value={formData.managerName || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Location & Contact</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input name="email" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input name="phone" value={formData.phone || ''} onChange={handleChange} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Physical Address</Label>
              <Input name="address" value={formData.address || ''} onChange={handleChange} />
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

export default PharmacyProfile;
