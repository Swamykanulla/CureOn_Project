import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { appointmentsService } from "@/services/api";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils";
import { LayoutDashboard, Calendar as CalIcon, FileText, Pill, Settings, HeartPulse } from "lucide-react";

const Prescriptions = () => {
  const { t } = useTranslation();
  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: CalIcon },
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

  return (
    <DashboardLayout navItems={navItems} userType="patient">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {t('common.prescriptions')}
          </h1>
          <p className="text-muted-foreground mt-1">
            View your prescription history
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(items || []).map((p) => (
            <div key={p.id} className="dashboard-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(p.created_at), "PP", { locale: getDateLocale() })}</span>
                </div>
                <span className="badge-status badge-pending">{p.status?.toLowerCase()}</span>
              </div>
              <div className="mt-2">
                <h3 className="font-semibold text-foreground">{p.diagnosis}</h3>
                <p className="text-sm text-muted-foreground">Dr. {p.doctor_name}</p>
              </div>
              <div className="mt-3 space-y-2">
                {(p.items || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.dosage} • {m.frequency}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{m.duration}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && (
            <div className="dashboard-card p-6 text-center text-muted-foreground">
              No prescriptions yet
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Prescriptions;
