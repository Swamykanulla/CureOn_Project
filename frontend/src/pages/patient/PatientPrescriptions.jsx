import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  HeartPulse,
  Search,
  Download,
  Filter
} from "lucide-react";
import { appointmentsService } from "@/services/api";

const PatientPrescriptions = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await appointmentsService.prescriptions.listPatient();
        setItems(res || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredPrescriptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return (items || []).filter(p =>
      (p.doctor_name || "").toLowerCase().includes(q) ||
      (p.items || []).some(m => (m.name || "").toLowerCase().includes(q))
    );
  }, [items, searchTerm]);

  const buildAttachmentUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };
  const handleDownload = (p) => {
    const url = buildAttachmentUrl(p.bill_attachment);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t('common.download', { defaultValue: 'Download' }));
    } else {
      toast.info("No bill available yet");
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="patient">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {t('prescriptions.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('prescriptions.subtitle')}
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('common.search')}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Prescription Groups */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrescriptions.map((p) => (
            <div key={p.id} className="dashboard-card p-4 hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {format(new Date(p.created_at), "PP", { locale: getDateLocale() })}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t('common.doctor', { defaultValue: 'Dr.' })} {p.doctor_name}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    (p.status || "").toUpperCase() === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {(p.status || "").toUpperCase() === "ACTIVE" ? t('prescriptions.active') : t('prescriptions.completed')}
                </span>
              </div>

              {/* Medicines List */}
              <div className="space-y-3">
                {(p.items || []).map((med, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-muted/30 p-2.5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border shrink-0">
                        <Pill className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {med.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
                   <p className="text-xs text-muted-foreground">
                     {t('common.duration')}: {(p.items?.[0]?.duration) || '-'}
                   </p>
                   <Button variant="ghost" size="sm" onClick={() => handleDownload(p)}>
                     <Download className="w-4 h-4 mr-2" />
                     {t('common.download', { defaultValue: 'Download' })}
                   </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredPrescriptions.length === 0 && !loading && (
            <div className="dashboard-card p-6 text-center text-muted-foreground">
              {t('common.noData', { defaultValue: 'No prescriptions yet' })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientPrescriptions;
