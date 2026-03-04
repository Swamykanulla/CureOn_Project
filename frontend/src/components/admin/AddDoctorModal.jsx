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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const specializations = [
  "General Physician",
  "Cardiologist",
  "Neurologist",
  "Orthopedic",
  "Dermatologist",
  "Pediatrician",
  "Ophthalmologist",
  "Psychiatrist",
  "ENT Specialist",
  "Gynecologist",
  "Urologist",
];

const AddDoctorModal = ({ open, onOpenChange, onDoctorAdded }) => {
  const [step, setStep] = useState("form");
  const [copied, setCopied] = useState(null);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    specialization: "",
    email: "",
    phone: "",
    experience: "",
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
    
    if (onDoctorAdded) {
      onDoctorAdded({
        ...formData,
        username: defaultUsername,
        password: generatedPassword,
      });
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
      age: "",
      specialization: "",
      email: "",
      phone: "",
      experience: "",
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
          role: "DOCTOR",
          phone: formData.phone,
          specialization: formData.specialization,
          first_name: formData.name.split(" ")[0],
          last_name: formData.name.split(" ").slice(1).join(" "),
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.email_sent) {
          toast.success("Doctor created and credentials emailed successfully");
          handleClose();
        } else {
          // Fallback: try manual send using just-created user id if available
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
                toast.success("Doctor created and credentials emailed successfully");
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
        let msg = "Failed to create doctor user";
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
      console.error("Error creating doctor user:", error);
      toast.error("Error creating doctor user");
    } finally {
      setSending(false);
    }
  };

  const isFormValid = formData.name && formData.age && formData.specialization && formData.email && formData.phone;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {step === "form" ? "Add New Doctor" : "Doctor Credentials"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="py-4 space-y-5">
            {/* Doctor Name */}
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name *</Label>
              <Input
                id="doctorName"
                placeholder="Dr. Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            {/* Age and Specialization */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization *</Label>
                <Select
                  value={formData.specialization}
                  onValueChange={(value) => handleInputChange("specialization", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specializations.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@cureon.com"
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

            {/* Experience (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience (Optional)</Label>
              <Input
                id="experience"
                type="number"
                placeholder="e.g., 5"
                value={formData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
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
                Doctor account created successfully!
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
              Edit credentials if needed, then save to create the doctor user.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button variant="hero" onClick={handleSaveUser} disabled={sending}>
                {sending ? "Saving & Sending..." : "Save & Send Mail"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddDoctorModal;
