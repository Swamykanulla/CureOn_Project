import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  FlaskConical,
  FileBarChart,
  Microscope,
  History,
  Settings,
  User,
  MapPin,
  Mail,
  Phone,
  Building
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { profileService } from "@/services/api";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsProfile = () => {
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
        const data = await profileService.labs.get();
        setFormData({
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          license: data.license_number || "",
          avatar: data.avatar || null,
        });
      } catch {}
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
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
        address: formData.address || "",
        license_number: formData.license || "",
      };
      await profileService.labs.update(payload);
      const refreshed = await profileService.labs.get();
      setFormData({
        name: `${refreshed.first_name || ""} ${refreshed.last_name || ""}`.trim() || refreshed.username,
        email: refreshed.email || "",
        phone: refreshed.phone || "",
        address: refreshed.address || "",
        license: refreshed.license_number || "",
      });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
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

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Lab Profile</h1>
          <p className="text-muted-foreground mt-1">Manage laboratory department details</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={buildAvatarUrl(formData.avatar) || "/placeholder-avatar.jpg"} alt="Lab" />
                    <AvatarFallback className="text-xl">LB</AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
                <div className="space-y-2 w-full">
                  <Label>Lab Name</Label>
                  <Input name="name" value={formData.name || ""} onChange={handleChange} />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input name="email" value={formData.email || ""} onChange={handleChange} />
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input name="phone" value={formData.phone || ""} onChange={handleChange} />
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input name="address" value={formData.address || ""} onChange={handleChange} />
                </div>
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <Input name="license" value={formData.license || ""} onChange={handleChange} />
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full" onClick={handleSave} disabled={loading}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">24</div>
                  <div className="text-sm text-muted-foreground">Staff Members</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">15</div>
                  <div className="text-sm text-muted-foreground">Active Instruments</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">120+</div>
                  <div className="text-sm text-muted-foreground">Daily Tests</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">SLA Compliance</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabsProfile;
