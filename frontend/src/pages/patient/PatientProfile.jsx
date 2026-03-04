import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Camera, Save, Activity, FileText, AlertCircle, LayoutDashboard, Calendar, Pill, HeartPulse, Settings } from "lucide-react";
import { toast } from "sonner";
import { profileService } from "@/services/api";

const PatientProfile = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  
  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];

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
        const data = await profileService.patient.get();
        setFormData({
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.username,
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          dob: data.date_of_birth || "",
          bloodType: data.blood_type || "",
          height: data.height_cm || "",
          weight: data.weight_kg || "",
          allergies: data.allergies || "",
          chronicDiseases: data.chronic_diseases || "",
          pastDiseases: data.past_diseases || "",
          familyHistory: data.family_history || "",
          avatar: data.avatar || null,
          patientId: data.profile_code || "",
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

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const updated = await profileService.avatar.upload(file);
      setFormData(prev => ({ ...prev, avatar: updated.avatar }));
      toast.success(t('profile.toast.imageUpdated'));
    } catch {
      toast.error(t('common.error'));
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
        address: formData.address || "",
        date_of_birth: formData.dob || null,
        blood_type: formData.bloodType || "",
        height_cm: formData.height ? Number(formData.height) : null,
        weight_kg: formData.weight ? Number(formData.weight) : null,
        allergies: formData.allergies || "",
        chronic_diseases: formData.chronicDiseases || "",
        past_diseases: formData.pastDiseases || "",
        family_history: formData.familyHistory || "",
      };
      const updated = await profileService.patient.update(payload);
      setLoading(false);
      toast.success(t('profile.success'));
      setFormData((prev) => ({ ...prev, email: updated.email }));
    } catch (e) {
      setLoading(false);
      toast.error(t('common.error'));
    }
  };

  const handleCancel = () => {
    if (patientProfile) {
      setFormData(patientProfile);
      toast.info(t('profile.toast.changesDiscarded'));
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="patient">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">{t('profile.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
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
            <p className="text-muted-foreground">{t('profile.patientId')}: {formData.patientId}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{t('profile.status.active')}</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{t('profile.status.premium')}</span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">{t('profile.personalInfo')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.labels.fullName')}</Label>
              <Input name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.email')}</Label>
              <Input name="email" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.phone')}</Label>
              <Input name="phone" value={formData.phone || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.dob')}</Label>
              <Input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>{t('profile.labels.address')}</Label>
              <Textarea name="address" value={formData.address || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">{t('profile.medicalDetails')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>{t('profile.labels.bloodType')}</Label>
              <Select value={formData.bloodType || ''} onValueChange={(value) => handleSelectChange("bloodType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.placeholders.bloodType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a+">A+</SelectItem>
                  <SelectItem value="a-">A-</SelectItem>
                  <SelectItem value="b+">B+</SelectItem>
                  <SelectItem value="b-">B-</SelectItem>
                  <SelectItem value="ab+">AB+</SelectItem>
                  <SelectItem value="ab-">AB-</SelectItem>
                  <SelectItem value="o+">O+</SelectItem>
                  <SelectItem value="o-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.height')}</Label>
              <Input type="number" name="height" value={formData.height || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.weight')}</Label>
              <Input type="number" name="weight" value={formData.weight || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.labels.allergies')}</Label>
              <Input name="allergies" value={formData.allergies || ''} onChange={handleChange} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>{t('profile.labels.chronic')}</Label>
              <Textarea name="chronicDiseases" placeholder={t('profile.placeholders.chronic')} value={formData.chronicDiseases || ''} onChange={handleChange} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>{t('profile.labels.past')}</Label>
              <Textarea name="pastDiseases" placeholder={t('profile.placeholders.past')} value={formData.pastDiseases || ''} onChange={handleChange} />
            </div>
            <div className="col-span-full space-y-2">
              <Label>{t('profile.labels.family')}</Label>
              <Textarea name="familyHistory" placeholder={t('profile.placeholders.family')} value={formData.familyHistory || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleCancel}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;
