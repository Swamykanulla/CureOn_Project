import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pharmacyService } from "@/services/api";
import {
  LayoutDashboard,
  Pill,
  ClipboardList,
  AlertCircle,
  Package,
  History,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacyDashboard = () => {
  const { user } = useUser();
  // const user = getUser("pharmacy");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [processedToday, setProcessedToday] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  const formatINR = (value) => {
    try {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
    } catch {
      return `₹${Number(value || 0).toFixed(2)}`;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = new Date();
        // parallel calls
        const [pending, completed, stats, recent, lowstock] = await Promise.all([
          pharmacyService.orders.list({ status: "PENDING" }),
          pharmacyService.orders.list({ status: "COMPLETED" }),
          pharmacyService.inventory.stats(),
          pharmacyService.orders.list({}),
          pharmacyService.inventory.list({ low_stock: true }),
        ]);
        setPendingCount((pending || []).length);
        const completedToday = (completed || []).filter(o => {
          const d = new Date(o.updated_at || o.created_at);
          return d.toDateString() === today.toDateString();
        });
        setProcessedToday(completedToday.length);
        const revenueToday = completedToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        setTotalRevenue(revenueToday);
        setLowStockCount(Number(stats?.low_stock || 0));
        const recentMap = (recent || []).slice(0, 3).map(o => ({
          id: o.id,
          patient: o.patient_name,
          items: (o.items || []).map(i => i.name),
          status: o.status,
          time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setRecentOrders(recentMap);
        setLowStockItems((lowstock || []).slice(0, 3));
      } catch (e) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => ([
    {
      title: "Pending Orders",
      value: String(pendingCount),
      icon: Clock,
      description: "Requires immediate attention",
    },
    {
      title: "Processed Today",
      value: String(processedToday),
      icon: CheckCircle2,
      description: "Orders completed",
    },
    {
      title: "Low Stock Items",
      value: String(lowStockCount),
      icon: AlertCircle,
      description: "Reorder required",
    },
    {
      title: "Total Revenue",
      value: formatINR(totalRevenue),
      icon: TrendingUp,
      description: "Today",
    },
  ]), [pendingCount, processedToday, lowStockCount, totalRevenue]);

  return (
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Pharmacy Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user?.first_name || user?.username || "Pharmacist"}
            </p>
          </div>
          <Button variant="hero" className="shrink-0" onClick={() => navigate("/pharmacy/orders")}>
            <Pill className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Recent Orders & Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-lg">Recent Orders</h2>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/pharmacy/orders")}>
                View All
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(order.patient || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {order.patient || "Unknown"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {order.items.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "PROCESSING"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "READY"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.time}
                      </p>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">No recent orders</div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions / Alerts */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-lg">Inventory Alerts</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {item.stock} units
                        </p>
                      </div>
                    </div>
                    {/* Reorder button intentionally removed */}
                  </div>
                ))}
                {lowStockItems.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">No low stock alerts</div>
                )}
              </div>
              <Button variant="secondary" className="w-full mt-6" onClick={() => navigate("/pharmacy/inventory")}>
                View Full Inventory
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyDashboard;
