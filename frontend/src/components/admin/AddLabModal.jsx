import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";

const AddLabModal = ({ open, onOpenChange, onLabAdded }) => {
  const [step, setStep] = useState("form");
  const [copied, setCopied] = useState(null);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    licenseNumber: "",
    email: "",
    phone: "",
    address: "",
  });

  const [credentials, setCredentials] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = () => {
    // Generate credentials
    const generatedPassword = generatePassword();
    const defaultUsername =
      (formData.email && formData.email.split("@")[0]) ||
      formData.name.replace(/\s+/g, "").toLowerCase();
    setCredentials({
      username: defaultUsername,
      email: formData.email,
      password: generatedPassword,
    });
    setStep("credentials");
    
    if (onLabAdded) {
      onLabAdded({ ...formData, username: defaultUsername, password: generatedPassword });
    }
  };

  const handleCopy = (type) => {
    const text = type === "email" ? credentials.email : credentials.password;
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = () => {
    setStep("form");
    setFormData({
      name: "",
      licenseNumber: "",
      email: "",
      phone: "",
      address: "",
    });
    setCredentials({ email: "", password: "" });
    onOpenChange(false);
  };

  const handleSaveUser = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("https://cureon-backend-5j6u.onrender.com/api/auth/create-staff/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
          role: "LAB",
          licenseNumber: formData.licenseNumber,
          phone: formData.phone,
          address: formData.address,
          first_name: formData.name.split(" ")[0],
          last_name: formData.name.split(" ").slice(1).join(" "),
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.email_sent) {
          toast.success("Lab created and credentials emailed successfully");
          handleClose();
        } else {
          try {
            const userId = data?.user?.id;
            if (userId) {
              const sendRes = await fetch("https://cureon-backend-5j6u.onrender.com/api/auth/admin/send-credentials/", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token ? `Bearer ${token}` : undefined,
                },
                body: JSON.stringify({ user_id: userId, password: credentials.password }),
              });
              const sendData = await sendRes.json().catch(() => ({}));
              if (sendRes.ok && sendData?.sent) {
                toast.success("Lab created and credentials emailed successfully");
                handleClose();
              } else {
                toast.error(sendData?.error || "User created, but email delivery failed");
              }
            } else {
              toast.error("User created, but email delivery failed");
            }
          } catch (e) {
            console.error(e);
            toast.error("User created, but email delivery failed");
          }
        }
      } else {
        let msg = "Failed to create lab user";
        try {
          const data = await res.json();
          if (data.username?.[0]) msg = data.username[0];
          else if (data.email?.[0]) msg = data.email[0];
          else if (data.password?.[0]) msg = data.password[0];
          else if (data.detail) msg = data.detail;
        } catch {
          const text = await res.text();
          console.error(text);
        }
        toast.error(msg);
      }
    } catch (error) {
      console.error("Error creating lab user:", error);
      toast.error("Error creating lab user");
    } finally {
      setSending(false);
    }
  };

  const isFormValid = formData.name && formData.licenseNumber && formData.email && formData.phone;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {step === "form" ? "Add New Lab" : "Lab Credentials"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="py-4 space-y-5">
            {/* Lab Name */}
            <div className="space-y-2">
              <Label htmlFor="labName">Lab Name *</Label>
              <Input
                id="labName"
                placeholder="Lab Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            {/* License Number */}
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number *</Label>
              <Input
                id="licenseNumber"
                placeholder="License Number"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
              />
            </div>

            {/* Contact Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="lab@cureon.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="Full Address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="hero"
                onClick={handleSubmit}
                className="flex-1"
                disabled={!isFormValid}
              >
                Generate Credentials
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="p-4 rounded-xl bg-success/10 border border-success/20">
              <p className="text-success font-medium text-center">
                Lab account created successfully!
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={credentials.username}
                    onChange={(e) => setCredentials((c) => ({ ...c, username: e.target.value }))}
                    className="bg-secondary"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy("username")}
                  >
                    {copied === "username" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Login Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={credentials.email}
                    onChange={(e) => setCredentials((c) => ({ ...c, email: e.target.value }))}
                    className="bg-secondary"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy("email")}
                  >
                    {copied === "email" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={credentials.password}
                    onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
                    className="bg-secondary font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy("password")}
                  >
                    {copied === "password" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Edit credentials if needed, then save to create the lab user.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
              >
                Close
              </Button>
              <Button 
                variant="hero" 
                onClick={handleSaveUser} 
                disabled={sending}
              >
                {sending ? "Saving & Sending..." : "Save & Send Mail"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddLabModal;
