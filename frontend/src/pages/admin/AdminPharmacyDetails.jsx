import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Settings,
  Mail,
  Phone,
  ArrowLeft,
  Users,
  Pill,
  FlaskConical,
  Wallet,
  MapPin,
  Building2,
  Package,
  AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Doctors", href: "/admin/doctors", icon: Stethoscope },
  { name: "Patients", href: "/admin/patients", icon: Users },
  { name: "Pharmacy", href: "/admin/pharmacy", icon: Pill },
  { name: "Labs", href: "/admin/labs", icon: FlaskConical },
  { name: "Payments", href: "/admin/payments", icon: Wallet },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const AdminPharmacyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState(null);
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const [detail, s, inv] = await Promise.all([
          adminService.getPharmacyDetail(id),
          adminService.getPharmacyStats(id),
          adminService.getPharmacyInventory(id),
        ]);
        setPharmacy(detail);
        setStats(s);
        setInventory(inv?.items || []);
      } catch (error) {
        console.error("Failed to fetch pharmacy details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Loading...</div></DashboardLayout>;
  }

  if (!pharmacy) {
    return <DashboardLayout navItems={navItems} userType="admin"><div>Pharmacy not found</div></DashboardLayout>;
  }

  const name = (pharmacy.first_name || pharmacy.last_name) ? `${pharmacy.first_name || ""} ${pharmacy.last_name || ""}`.trim() || pharmacy.username : pharmacy.username;

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/pharmacy")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Pharmacy Details</h1>
            <p className="text-muted-foreground">View information and order history</p>
          </div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-3xl">{name.charAt(0).toUpperCase()}</span>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{name}</h2>
                <p className="text-lg text-muted-foreground font-medium">License: {pharmacy.license_number || "N/A"}</p>
              </div>

              
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[320px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="dashboard-card p-5">
                <div className="text-sm text-muted-foreground">Pending Orders</div>
                <div className="text-2xl font-bold">{stats?.pending_orders ?? 0}</div>
              </div>
              <div className="dashboard-card p-5">
                <div className="text-sm text-muted-foreground">Processed Today</div>
                <div className="text-2xl font-bold">{pharmacy?.processed_prescriptions?.filter(p=>new Date(p.created_at).toDateString()===new Date().toDateString()).length || 0}</div>
              </div>
              <div className="dashboard-card p-5">
                <div className="text-sm text-muted-foreground">Low Stock Items</div>
                <div className="text-2xl font-bold">{stats?.low_stock_items ?? 0}</div>
              </div>
              <div className="dashboard-card p-5">
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">₹{Number(stats?.total_revenue || 0).toFixed(2)}</div>
              </div>
            </div>
            
            <div className="dashboard-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Pharmacy Information</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="text-sm"><span className="text-muted-foreground">Email</span><div>{pharmacy.email || "-"}</div></div>
                <div className="text-sm"><span className="text-muted-foreground">Phone</span><div>{pharmacy.phone || "-"}</div></div>
                <div className="text-sm"><span className="text-muted-foreground">Address</span><div>{pharmacy.address || "-"}</div></div>
                <div className="text-sm"><span className="text-muted-foreground">Created</span><div>{new Date(pharmacy.date_joined).toLocaleDateString()}</div></div>
                <div className="text-sm"><span className="text-muted-foreground">Status</span><div>{pharmacy.is_active ? "Active" : "Inactive"}</div></div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="dashboard-card p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                  <div className="text-2xl font-bold">{inventory.length}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="dashboard-card p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Low Stock Alerts</div>
                  <div className="text-2xl font-bold">{(stats?.low_stock_items ?? inventory.filter((it)=>it.stock < it.min_stock).length)}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
              </div>
              <div className="dashboard-card p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-2xl font-bold">
                    ₹{Number(inventory.reduce((sum, it)=> sum + (Number(it.price||0) * Number(it.stock||0)), 0)).toFixed(2)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-success">INR</span>
                </div>
              </div>
            </div>
            <div className="dashboard-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Expiry Date</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length ? inventory.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell>{it.category}</TableCell>
                      <TableCell className={it.stock < it.min_stock ? "text-warning" : "text-success"}>{it.stock}</TableCell>
                      <TableCell>₹{Number(it.price || 0).toFixed(2)}</TableCell>
                      <TableCell>{it.expiry || "-"}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No inventory items.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPharmacyDetails;
