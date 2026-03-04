import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LayoutDashboard, Stethoscope, Calendar, Settings, User, Bell, Shield, Users, Pill, FlaskConical, Eye, EyeOff, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services/api";
import { useUser } from "@/context/UserContext";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminSettings = () => {
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [newUsername, setNewUsername] = useState("");
  const { refreshUser } = useUser();
  const [showPwd, setShowPwd] = useState({ current: false, new: false });
  const handleUpdatePassword = async () => {
    if (!password.current || !password.new || !password.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (password.new !== password.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      await authService.changePassword(password.current, password.new);
      toast.success("Password updated successfully");
      setPassword({ current: "", new: "", confirm: "" });
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to update password";
      toast.error(msg);
    }
  };
  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6 max-w-4xl">
        <div><h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Settings</h1><p className="text-muted-foreground mt-1">Manage admin preferences</p></div>
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6"><Bell className="w-5 h-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Notifications</h2></div>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">Email Alerts</p><p className="text-sm text-muted-foreground">System notifications</p></div><Switch defaultChecked /></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-foreground">New User Alerts</p><p className="text-sm text-muted-foreground">When new users register</p></div><Switch defaultChecked /></div>
          </div>
        </div>
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6"><Shield className="w-5 h-5 text-primary" /><h2 className="font-display text-lg font-semibold text-foreground">Security</h2></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Username</Label>
              <Input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              <Button variant="outline" onClick={async () => {
                if (!newUsername.trim()) {
                  toast.error("Please enter a username");
                  return;
                }
                try {
                  await authService.changeUsername(newUsername.trim());
                  toast.success("Username updated successfully");
                  await refreshUser();
                  setNewUsername("");
                } catch (e) {
                  const msg = e?.response?.data?.detail || "Failed to update username";
                  toast.error(msg);
                }
              }}>Update Username</Button>
            </div>
            <div className="space-y-2"><Label>Current Password</Label>
              <div className="relative">
                <Input type={showPwd.current ? "text" : "password"} value={password.current} onChange={(e) => setPassword(p => ({ ...p, current: e.target.value }))} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}>
                  {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2"><Label>New Password</Label>
              <div className="relative">
                <Input type={showPwd.new ? "text" : "password"} value={password.new} onChange={(e) => setPassword(p => ({ ...p, new: e.target.value }))} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}>
                  {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye clas   sName="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2"><Label>Confirm New Password</Label>
              <Input type="password" value={password.confirm} onChange={(e) => setPassword(p => ({ ...p, confirm: e.target.value }))} />
              
            </div>
            <Button variant="outline" onClick={handleUpdatePassword}>Update Password</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
