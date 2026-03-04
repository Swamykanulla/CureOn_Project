import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import AppointmentCard from "@/components/dashboard/AppointmentCard";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { enUS, hi, te } from "date-fns/locale";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { appointmentsService } from "@/services/api";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'hi': return hi;
      case 'te': return te;
      default: return enUS;
    }
  };

  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];
  
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labResults, setLabResults] = useState([]);

  const mapType = (t) => (t === "IN_PERSON" ? "in-person" : "video");
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
        const [appts, presc, labs] = await Promise.all([
          appointmentsService.myAppointments(),
          appointmentsService.prescriptions.listPatient(),
          appointmentsService.lab.patientResults(),
        ]);
        setAppointments(appts || []);
        setPrescriptions(presc || []);
        setLabResults(labs || []);
      } catch {
        setAppointments([]);
        setPrescriptions([]);
        setLabResults([]);
      }
    };
    load();
  }, []);

  const upcomingAppointments = useMemo(() => {
    return (appointments || [])
      .filter((a) => a.status === "UPCOMING")
      .slice(0, 5)
      .map((a) => ({
        doctorName: a.doctor_name || "Doctor",
        specialty: a.doctor_specialization || "",
        date: new Date(a.date),
        time: a.time_slot,
        type: mapType(a.visit_type),
        status: "upcoming",
        avatar: buildAvatarUrl(a.doctor_avatar),
      }));
  }, [appointments]);

  const stats = useMemo(() => {
    const upcoming = (appointments || []).filter((a) => a.status === "UPCOMING").length;
    const completed = (appointments || []).filter((a) => a.status === "COMPLETED").length;
    const activeRx = (prescriptions || []).filter((p) => (p.status || "").toUpperCase() === "ACTIVE").length;
    return { upcoming, completed, activeRx };
  }, [appointments, prescriptions]);

  const recentRecords = useMemo(() => {
    const labs = (labResults || []).slice(0, 3).map((lr) => ({
      name: Array.isArray(lr.tests) ? lr.tests.join(", ") : t('dashboard.recentRecordsData.labReport'),
      date: new Date(lr.created_at),
      type: t('dashboard.recentRecordsData.labReport'),
    }));
    const rx = (prescriptions || []).slice(0, 3).map((p) => ({
      name: p.diagnosis || t('dashboard.recentRecordsData.prescription'),
      date: new Date(p.created_at),
      type: t('dashboard.recentRecordsData.prescription'),
    }));
    return [...labs, ...rx].sort((a, b) => b.date - a.date).slice(0, 3);
  }, [labResults, prescriptions, t]);

  return (
    <DashboardLayout
      navItems={navItems}
      userType="patient"
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {t('dashboard.welcome')} {user?.first_name || user?.username}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('dashboard.overview')}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div onClick={() => navigate("/patient/appointments")} className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title={t('dashboard.upcomingAppointments')}
              value={stats.upcoming}
              icon={Calendar}
              iconColor="text-primary"
              iconBg="bg-primary/10"
            />
          </div>
          <div className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title={t('dashboard.completedVisits')}
              value={stats.completed}
              icon={CheckCircle2}
              iconColor="text-success"
              iconBg="bg-success/10"
            />
          </div>
          <div onClick={() => navigate("/patient/prescriptions")} className="cursor-pointer transition-transform hover:scale-105">
            <StatCard
              title={t('dashboard.activePrescriptions')}
              value={stats.activeRx}
              icon={Pill}
              iconColor="text-accent"
              iconBg="bg-accent/10"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {t('dashboard.upcomingAppointments')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/patient/appointments")}>
                {t('common.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={index}
                  {...appointment}
                  date={format(appointment.date, "PP", { locale: getDateLocale() })}
                  userType="patient"
                />
              ))}
            </div>
          </div>

          {/* Recent Records */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {t('dashboard.recentRecords')}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/patient/records")}>
                {t('common.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="dashboard-card divide-y divide-border">
              {recentRecords.map((record, index) => (
                <div 
                  key={index} 
                  className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/patient/records")}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{record.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{record.type}</span>
                        <span>•</span>
                        <span>{format(record.date, "PP", { locale: getDateLocale() })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};


export default PatientDashboard;
