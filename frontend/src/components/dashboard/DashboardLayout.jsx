import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/context/UserContext";
import LanguageSelector from "@/components/dashboard/LanguageSelector";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Stethoscope,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsService } from "@/services/api";

const DashboardLayout = ({
  children,
  navItems,
  userType,
  userName: propUserName,
  userAvatar: propUserAvatar,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const loadUnread = async () => {
    try {
      const c = await notificationsService.unreadCount();
      setUnread(c);
    } catch (e) {}
  };
  const loadList = async () => {
    try {
      const data = await notificationsService.list({ limit: 10 });
      setNotifs(data);
      loadUnread();
    } catch (e) {}
  };
  const getTargetPath = (n) => {
    const t = n.type;
    const data = n.data || {};
    if (userType === "doctor") {
      if (t === "APPOINTMENT_BOOKED" || t === "APPOINTMENT_STATUS" || t === "RESCHEDULE_REQUEST") return "/doctor/appointments";
      if (t === "LAB_STATUS" || t === "LAB_RESULT_READY") return "/doctor/patients";
      if (t === "PRESCRIPTION_CREATED") return "/doctor/appointments";
      return "/doctor/dashboard";
    }
    if (userType === "patient") {
      if (t === "APPOINTMENT_STATUS") return "/patient/appointments";
      if (t === "PRESCRIPTION_CREATED" || t === "PHARMACY_STATUS") return "/patient/prescriptions";
      if (t === "LAB_REQUEST_CREATED" || t === "LAB_STATUS" || t === "LAB_RESULT_READY") return "/patient/records";
      return "/patient/dashboard";
    }
    if (userType === "pharmacy") {
      if (t === "PHARMACY_STATUS" || t === "PRESCRIPTION_CREATED") return "/pharmacy/orders";
      return "/pharmacy/dashboard";
    }
    if (userType === "labs") {
      if (t === "LAB_REQUEST_CREATED" || t === "LAB_STATUS") return "/labs/requests";
      if (t === "LAB_RESULT_READY") return "/labs/results";
      return "/labs/dashboard";
    }
    if (userType === "admin") {
      return "/admin/dashboard";
    }
    return "/";
  };
  const handleOpenNotification = async (n) => {
    try {
      if (!n.is_read) {
        await notificationsService.markRead(n.id);
      }
    } catch (e) {}
    const target = getTargetPath(n);
    navigate(target);
    setNotifOpen(false);
    loadUnread();
  };
  useEffect(() => {
    loadUnread();
  }, []);
  
  const userName = user?.username || propUserName || "User";
  const buildAvatarUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };
  const userAvatar = propUserAvatar || buildAvatarUrl(user?.avatar);

  const userTypeLabels = {
    patient: "Patient",
    doctor: "Doctor",
    admin: "Administrator",
    pharmacy: "Pharmacy",
    labs: "Laboratory",
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full border-r border-sidebar-border">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-sidebar-foreground">
                CureOn
              </span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? "text-sidebar-primary" : ""}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-secondary"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector - Only for Patients */}
            {userType === 'patient' && <LanguageSelector />}

            <DropdownMenu open={notifOpen} onOpenChange={(o)=>{setNotifOpen(o); if(o) loadList();}}>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-medium">Notifications</span>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={async ()=>{await notificationsService.markAllRead(); await loadList();}}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-96 overflow-auto">
                  {notifs.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                  )}
                  {notifs.map((n)=>(
                    <div
                      key={n.id}
                      className={`px-3 py-2 border-b last:border-b-0 ${n.is_read ? "" : "bg-secondary/40"} cursor-pointer hover:bg-secondary`}
                      onClick={()=>handleOpenNotification(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          {n.sender_avatar ? <img src={n.sender_avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xs">{(n.sender_name || "U").charAt(0)}</span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{n.title}</span>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-accent" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                          <div className="mt-2">
                            {!n.is_read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async (e)=>{e.stopPropagation(); await notificationsService.markRead(n.id); await loadList();}}
                              >
                                Mark read
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-foreground font-semibold text-sm">
                        {userName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-foreground">{userName}</p>
                  <p className="text-sm text-muted-foreground">{userTypeLabels[userType]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/${userType}/profile`)}>
                  <User className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.profile') : "Profile"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/${userType}/settings`)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.settings') : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {userType === 'patient' ? t('common.logout') : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};


export default DashboardLayout;
