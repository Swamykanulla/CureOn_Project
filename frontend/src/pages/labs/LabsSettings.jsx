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
  FlaskConical,
  FileBarChart,
  Microscope,
  History,
  Settings,
  User,
  Bell,
  Lock,
  Save
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

import { Eye, EyeOff } from "lucide-react";

const LabsSettings = () => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });
  const [newUsername, setNewUsername] = useState("");
  const { refreshUser } = useUser();
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Settings saved successfully");
    }, 1000);
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
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your lab profile details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab-name">Lab Name</Label>
                    <Input id="lab-name" defaultValue="CureOn Main Lab" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" defaultValue="lab@cureon.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" defaultValue="Building B, Floor 2" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure how you receive alerts and updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="new-requests" className="flex flex-col space-y-1">
                    <span>New Test Requests</span>
                    <span className="font-normal text-xs text-muted-foreground">Receive alerts for incoming test requests</span>
                  </Label>
                  <Switch id="new-requests" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="urgent-alerts" className="flex flex-col space-y-1">
                    <span>Urgent Result Alerts</span>
                    <span className="font-normal text-xs text-muted-foreground">Immediate notification for critical values</span>
                  </Label>
                  <Switch id="urgent-alerts" defaultChecked />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="equipment-status" className="flex flex-col space-y-1">
                    <span>Equipment Status Updates</span>
                    <span className="font-normal text-xs text-muted-foreground">Alerts for maintenance and errors</span>
                  </Label>
                  <Switch id="equipment-status" defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Manage your password and access settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-username">New Username</Label>
                  <Input id="new-username" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
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
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input id="current-password" type={showPwd.current ? "text" : "password"} value={password.current} onChange={(e) => setPassword(p => ({ ...p, current: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}>
                      {showPwd.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPwd.new ? "text" : "password"} value={password.new} onChange={(e) => setPassword(p => ({ ...p, new: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}>
                      {showPwd.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showPwd.confirm ? "text" : "password"} value={password.confirm} onChange={(e) => setPassword(p => ({ ...p, confirm: e.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}>
                      {showPwd.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LabsSettings;
