import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { authService } from "@/services/api";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  User,
  Bell,
  Shield,
  HeartPulse,
  Eye,
  EyeOff,
} from "lucide-react";

const PatientSettings = () => {
  const { t } = useTranslation();
  const { refreshUser } = useUser();
  
  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];

  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    prescriptions: false,
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
      const type = key.charAt(0).toUpperCase() + key.slice(1);
      const status = newState[key] ? 'enabled' : 'disabled';
      toast.success(t(`settings.toast.${status}`, { type }));
      return newState;
    });
  };

  const handleUpdatePassword = async () => {
    if (!password.current || !password.new || !password.confirm) {
      toast.error(t('settings.security.fillAll'));
      return;
    }
    if (password.new !== password.confirm) {
      toast.error(t('settings.security.mismatch'));
      return;
    }
    try {
      await authService.changePassword(password.current, password.new);
      toast.success(t('settings.security.success'));
      setPassword({ current: "", new: "", confirm: "" });
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to update password";
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userType="patient"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {t('settings.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Notifications Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t('settings.notifications.title')}
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('settings.notifications.email')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.emailDesc')}</p>
              </div>
              <Switch 
                checked={notifications.email}
                onCheckedChange={() => handleNotificationChange('email')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('settings.notifications.sms')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.smsDesc')}</p>
              </div>
              <Switch 
                checked={notifications.sms}
                onCheckedChange={() => handleNotificationChange('sms')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('settings.notifications.prescription')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.notifications.prescriptionDesc')}</p>
              </div>
              <Switch 
                checked={notifications.prescriptions}
                onCheckedChange={() => handleNotificationChange('prescriptions')}
              />
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t('settings.security.title')}
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
                  toast.error(t('settings.security.fillAll'));
                  return;
                }
                try {
                  await authService.changeUsername(newUsername.trim());
                  toast.success(t('settings.security.success'));
                  await refreshUser();
                  setNewUsername("");
                } catch (e) {
                  const msg = e?.response?.data?.detail || "Failed to update username";
                  toast.error(msg);
                }
              }}>{t('settings.security.update')}</Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('settings.security.current')}</Label>
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
              <Label htmlFor="newPassword">{t('settings.security.new')}</Label>
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
              <Label htmlFor="confirmPassword">{t('settings.security.confirm')}</Label>
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
            <Button variant="outline" onClick={handleUpdatePassword}>{t('settings.security.update')}</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientSettings;
