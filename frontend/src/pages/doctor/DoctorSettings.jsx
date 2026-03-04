import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { authService } from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  User,
  Bell,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorSettings = () => {
  const { refreshUser } = useUser();
  const [notifications, setNotifications] = useState({
    appointments: true,
    reminders: true,
    messages: true,
    cancellations: false,
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [newUsername, setNewUsername] = useState("");
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleNotificationChange = (key) => {
    setNotifications(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${newState[key] ? 'enabled' : 'disabled'}`);
      return newState;
    });
  };

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
    <DashboardLayout
      navItems={navItems}
      userType="doctor"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
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
                <p className="font-medium text-foreground">New Appointment Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when a patient books an appointment</p>
              </div>
              <Switch 
                checked={notifications.appointments}
                onCheckedChange={() => handleNotificationChange('appointments')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Appointment Reminders</p>
                <p className="text-sm text-muted-foreground">Receive reminders before scheduled appointments</p>
              </div>
              <Switch 
                checked={notifications.reminders}
                onCheckedChange={() => handleNotificationChange('reminders')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Patient Messages</p>
                <p className="text-sm text-muted-foreground">Get notified of new patient messages</p>
              </div>
              <Switch 
                checked={notifications.messages}
                onCheckedChange={() => handleNotificationChange('messages')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Cancellation Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when appointments are cancelled</p>
              </div>
              <Switch 
                checked={notifications.cancellations}
                onCheckedChange={() => handleNotificationChange('cancellations')}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Security
            </h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newUsername">New Username</Label>
              <Input 
                id="newUsername" 
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
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
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input 
                  id="currentPassword" 
                  type={showPwd.current ? "text" : "password"}
                  value={password.current}
                  onChange={(e) => setPassword(prev => ({ ...prev, current: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}>
                  {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showPwd.new ? "text" : "password"}
                  value={password.new}
                  onChange={(e) => setPassword(prev => ({ ...prev, new: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}>
                  {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  type={showPwd.confirm ? "text" : "password"}
                  value={password.confirm}
                  onChange={(e) => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}>
                  {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={handleUpdatePassword}>Update Password</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorSettings;
