import React, { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { authService } from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  Bell,
  Shield,
  CreditCard,
  Store,
  Eye,
  EyeOff
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacySettings = () => {
  const { refreshUser } = useUser();
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [newUsername, setNewUsername] = useState("");
  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const handleCancel = () => {
    toast.info("Changes discarded");
  };

  const handleChangePassword = async () => {
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
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage pharmacy configuration and preferences
          </p>
        </div>

        {/* General Settings */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              General Configuration
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                <Input id="pharmacyName" defaultValue="Central Pharmacy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license">License Number</Label>
                <Input id="license" defaultValue="PH-12345" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" defaultValue="+1 (555) 999-8888" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" defaultValue="pharmacy@cureon.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" defaultValue="Building B, Ground Floor, Medical Center" />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Notification Preferences
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Order Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when a new prescription order is received</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Low Stock Alerts</p>
                <p className="text-sm text-muted-foreground">Receive warnings when inventory falls below minimum levels</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Expiry Notifications</p>
                <p className="text-sm text-muted-foreground">Get alerted about medicines nearing expiry date</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Security & Access
            </h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newUsername">New Username</Label>
              <Input id="newUsername" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              <Button variant="outline" className="mt-2" onClick={async () => {
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
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input id="currentPassword" type={showPwd.current ? "text" : "password"} value={password.current} onChange={(e) => setPassword(p => ({ ...p, current: e.target.value }))} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}>
                  {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input id="newPassword" type={showPwd.new ? "text" : "password"} value={password.new} onChange={(e) => setPassword(p => ({ ...p, new: e.target.value }))} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}>
                  {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input id="confirmPassword" type={showPwd.confirm ? "text" : "password"} value={password.confirm} onChange={(e) => setPassword(p => ({ ...p, confirm: e.target.value }))} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}>
                  {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button variant="outline" className="mt-2" onClick={handleChangePassword}>Change Password</Button>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="hero" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacySettings;
