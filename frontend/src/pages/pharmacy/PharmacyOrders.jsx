import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  Search,
  Filter,
  RefreshCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Printer,
  FileText,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pharmacyService, appointmentsService } from "@/services/api";

const formatINR = (value) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toFixed(2)}`;
  }
};

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacyOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    patient: null,
    items: [{ query: "", inventory: null, name: "", unit_price: 0, quantity: "" }],
  });
  const [picker, setPicker] = useState({ openIndex: null, query: "", results: [], loading: false });
  const debounceRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [isViewBillOpen, setIsViewBillOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef(null);
  const [orderForUpload, setOrderForUpload] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await pharmacyService.orders.list({ status: statusFilter === "All" ? undefined : statusFilter.toUpperCase() });
        const mapped = (res || []).map(o => ({
          id: o.id,
          displayId: o.order_id,
          prescription_id: o.prescription_id,
          patientName: o.patient_name,
          doctorName: "", // not available from order
          date: new Date(o.created_at).toISOString().split('T')[0],
          time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: o.status.charAt(0) + o.status.slice(1).toLowerCase(),
          items: (o.items || []).map(m => ({
            id: m.id,
            name: m.name,
            quantity: m.quantity || 0,
            price: (() => {
              const amt = m.amount != null ? Number(m.amount) : null;
              if (amt != null && !Number.isNaN(amt)) return formatINR(amt);
              const up = Number(m.unit_price || 0);
              const q = Number(m.quantity || 0);
              return formatINR(up * q);
            })()
          })),
          total: o.total_amount != null ? formatINR(o.total_amount) : ''
        }));
        setOrders(mapped);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [statusFilter]);

  const handleSyncFromPrescriptions = async () => {
    setSyncing(true);
    try {
      const res = await pharmacyService.orders.backfill();
      let ordersData = res?.orders || [];
      if (!ordersData.length) {
        const recalc = await pharmacyService.orders.recalcTotals();
        ordersData = recalc?.orders || ordersData;
      } else {
        try {
          const recalc = await pharmacyService.orders.recalcTotals();
          if (recalc?.orders?.length) {
            ordersData = recalc.orders;
          }
        } catch {}
      }
      const mapped = ordersData.map(o => ({
        id: o.id,
        displayId: o.order_id,
        prescription_id: o.prescription_id,
        patientName: o.patient_name,
        doctorName: "",
        date: new Date(o.created_at).toISOString().split('T')[0],
        time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: o.status.charAt(0) + o.status.slice(1).toLowerCase(),
        items: (o.items || []).map(m => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity || 0,
          price: (() => {
            const amt = m.amount != null ? Number(m.amount) : null;
            if (amt != null && !Number.isNaN(amt)) return formatINR(amt);
            const up = Number(m.unit_price || 0);
            const q = Number(m.quantity || 0);
            return formatINR(up * q);
          })()
        })),
        total: o.total_amount != null ? formatINR(o.total_amount) : ''
      }));
      setOrders(mapped);
      const created = res?.created ?? 0;
      if (created > 0) {
        toast.success(`Synced ${created} orders from prescriptions`);
      } else {
        toast.info("Orders synced and totals recalculated");
      }
    } catch {
      toast.error("Failed to sync from prescriptions");
    } finally {
      setSyncing(false);
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    toast.success(`Order ${orderId} status updated to ${newStatus}`);
  };

  const handleCreateOrder = async () => {
    const valid = (newOrder.items || []).filter(it => it.inventory && (Number(String(it.quantity).replace(/[^0-9]/g, "")) || 0) > 0);
    if (!newOrder.patientName || valid.length === 0) {
      toast.error("Enter patient and add at least one medication with quantity");
      return;
    }
    try {
      const payload = {
        patient_name: newOrder.patientName,
        items: valid.map(it => ({
          inventory_id: it.inventory.id,
          quantity: Number(String(it.quantity).replace(/[^0-9]/g, "")) || 0,
        })),
      };
      const created = await pharmacyService.orders.createManual(payload);
      const mapped = {
        id: created.id,
        displayId: created.order_id,
        prescription_id: created.prescription_id,
        patientName: created.patient_name,
        doctorName: "",
        date: new Date(created.created_at).toISOString().split('T')[0],
        time: new Date(created.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: created.status.charAt(0) + created.status.slice(1).toLowerCase(),
        items: (created.items || []).map(m => ({
          id: m.id,
          name: m.name,
          quantity: m.quantity || 0,
          price: (() => {
            const amt = m.amount != null ? Number(m.amount) : null;
            if (amt != null && !Number.isNaN(amt)) return formatINR(amt);
            const up = Number(m.unit_price || 0);
            const q = Number(m.quantity || 0);
            return formatINR(up * q);
          })()
        })),
        total: created.total_amount != null ? formatINR(created.total_amount) : '',
      };
      setOrders(prev => [mapped, ...prev]);
      setIsNewOrderOpen(false);
      setNewOrder({ patientName: "", items: [{ query: "", inventory: null, name: "", unit_price: 0, quantity: "" }] });
      toast.success("Order created");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to create order";
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (picker.openIndex == null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await pharmacyService.inventory.list({ search: picker.query });
        setPicker(p => ({ ...p, results: res || [] }));
      } catch {
        setPicker(p => ({ ...p, results: [] }));
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [picker.openIndex, picker.query]);

  


  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Ready":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch =
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.displayId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesFilter;
  }), [orders, searchTerm, statusFilter]);

  return (
    <>
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Medication Orders
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and process patient prescriptions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncFromPrescriptions} disabled={syncing}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              {syncing ? "Syncing..." : "Sync from Prescriptions"}
            </Button>
            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new prescription order.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="patient" className="text-right">Patient</Label>
                    <Input
                      id="patient"
                      value={newOrder.patientName}
                      onChange={(e) => setNewOrder({...newOrder, patientName: e.target.value})}
                      className="col-span-3"
                      placeholder="Patient Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Medications</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewOrder(o => ({ ...o, items: [...o.items, { query: "", inventory: null, name: "", unit_price: 0, quantity: "" }] }))}
                      >
                        + Add Medication
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {newOrder.items.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-lg">
                          <div className="col-span-6">
                            <Label className="text-xs">Medication</Label>
                            <Popover open={picker.openIndex === idx} onOpenChange={(o) => setPicker(p => ({ ...p, openIndex: o ? idx : null, query: it.query || "" }))}>
                              <PopoverTrigger asChild>
                                <Input
                                  placeholder="Search medicine"
                                  readOnly={false}
                                  value={it.query || it.name || ""}
                                  onChange={(e) => {
                                    const q = e.target.value;
                                    setNewOrder(o => {
                                      const items = [...o.items];
                                      items[idx] = { ...items[idx], query: q };
                                      return { ...o, items };
                                    });
                                    setPicker(p => ({ ...p, openIndex: idx, query: q }));
                                  }}
                                  onFocus={() => setPicker(p => ({ ...p, openIndex: idx, query: it.query || "" }))}
                                />
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[320px]" align="start">
                                <Command>
                                  <CommandInput placeholder="Type to search..." value={picker.query} onValueChange={(v) => setPicker(p => ({ ...p, query: v }))} />
                                  <CommandList>
                                    <CommandEmpty>No items</CommandEmpty>
                                    <CommandGroup>
                                      {(picker.results || []).map((r) => (
                                        <CommandItem
                                          key={r.id}
                                          value={r.name}
                                          onSelect={() => {
                                            setNewOrder(o => {
                                              const items = [...o.items];
                                              items[idx] = { ...items[idx], inventory: r, name: r.name, unit_price: r.price, query: r.name };
                                              return { ...o, items };
                                            });
                                            setPicker(p => ({ ...p, openIndex: null, query: "" }));
                                          }}
                                        >
                                          <div className="flex justify-between w-full">
                                            <span>{r.name}</span>
                                            <span className="text-xs text-muted-foreground">{formatINR(r.price)}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              value={it.quantity}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNewOrder(o => {
                                  const items = [...o.items];
                                  items[idx] = { ...items[idx], quantity: v };
                                  return { ...o, items };
                                });
                              }}
                              placeholder="e.g. 10"
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Price</Label>
                            <Input value={formatINR(it.unit_price)} readOnly />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateOrder}>Create Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or order ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {["All", "Pending", "Processing", "Ready", "Completed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Order Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-muted-foreground">
                        {order.displayId}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{order.patientName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Prescribed by {order.doctorName} • {order.date} at {order.time}
                    </p>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 lg:mx-8">
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex gap-4 text-muted-foreground">
                            <span>{item.quantity ? `${item.quantity} qty` : ""}</span>
                            <span>{item.price}</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-sm">
                        <span>Total</span>
                        <span>{order.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(order); setIsViewBillOpen(true); }}>
                      <FileText className="w-4 h-4" />
                    </Button>
                    {order.status === "Pending" && Number.isInteger(order.id) && (
                      <Button size="sm" variant="hero" onClick={async () => {
                        try {
                          await pharmacyService.orders.accept(order.id);
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Accepted" } : o));
                          toast.success("Order accepted");
                        } catch {}
                      }}>Start Processing</Button>
                    )}
                    {order.status === "Accepted" && Number.isInteger(order.id) && (
                      <Button size="sm" variant="hero" className="bg-green-600 hover:bg-green-700" onClick={async () => {
                        try {
                          await pharmacyService.orders.complete(order.id);
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Completed" } : o));
                          toast.success("Order completed");
                        } catch (e) {
                          if (e?.response?.status === 409) {
                            toast.error("Insufficient stock for some items");
                          }
                        }
                      }}>
                        Complete Order
                      </Button>
                    )}
                    {order.status === "Pending" && Number.isInteger(order.id) && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await pharmacyService.orders.reject(order.id);
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Cancelled" } : o));
                          toast.success("Order cancelled");
                        } catch {}
                      }}>
                        Cancel
                      </Button>
                    )}
                    {Number.isInteger(order.id) && <Button size="sm" variant="outline" onClick={() => {
                      setOrderForUpload(order);
                      if (uploadInputRef.current) uploadInputRef.current.click();
                    }} disabled={uploading}>
                      Upload Bill
                    </Button>}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No orders found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Removed Billing Dialog in favor of direct bill printing */}
    </DashboardLayout>
      {/* View Bill Dialog */}
      <Dialog open={isViewBillOpen} onOpenChange={setIsViewBillOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Order Bill</DialogTitle>
            <DialogDescription>
              View complete information for order {selectedOrder?.displayId || `ORD-${String(selectedOrder?.id || "").padStart(4,"0")}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Date:</span>
                <span className="col-span-3">{selectedOrder.date} {selectedOrder.time}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Patient:</span>
                <span className="col-span-3">{selectedOrder.patientName}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Items:</span>
                <span className="col-span-3">
                  <div className="space-y-1">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="font-medium">{it.name}</span>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{it.quantity ? `${it.quantity} qty` : ""}</span>
                          <span>{it.price}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-sm">
                      <span>Total</span>
                      <span>{selectedOrder.total}</span>
                    </div>
                  </div>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Status:</span>
                <span className="col-span-3">{selectedOrder.status}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewBillOpen(false)}>Close</Button>
            {selectedOrder && Number.isInteger(selectedOrder.id) && (
              <Button onClick={async () => {
                  try {
                    const blob = await pharmacyService.orders.receipt(selectedOrder.id);
                    const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `bill_${selectedOrder.displayId || selectedOrder.id}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setIsViewBillOpen(false);
                  } catch {
                    toast.error("Failed to generate bill");
                  }
              }}>
                Print Bill
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !orderForUpload) return;
          setUploading(true);
          try {
            // Fetch prescription items to get correct IDs
            const prescs = await appointmentsService.prescriptions.listPharmacy();
            const presc = (prescs || []).find(p => p.id === orderForUpload.prescription_id);
            const nameToId = {};
            (presc?.items || []).forEach(pi => { nameToId[String(pi.name).toLowerCase()] = pi.id; });
            const itemsPayload = (orderForUpload.items || []).map((it) => {
              const pid = nameToId[String(it.name).toLowerCase()];
              return {
                id: pid,
                quantity: Number(it.quantity) || 0,
                unit_price: it.price ? Number(String(it.price).replace(/[^0-9.]/g, "")) : 0,
              };
            }).filter(x => x.id != null);
            const updated = await appointmentsService.prescriptions.updatePharmacyBill(orderForUpload.prescription_id, itemsPayload, file);
            setOrders(prev => prev.map(o => o.id === orderForUpload.id ? {
              ...o,
              items: (updated.items || []).map(m => ({
                id: m.id,
                name: m.name || m.item_name,
                quantity: m.quantity,
                price: formatINR(m.unit_price),
              })),
              total: formatINR(updated.total_amount || 0),
            } : o));
            toast.success("Bill uploaded");
          } catch {
            toast.error("Failed to upload bill");
          } finally {
            setUploading(false);
            setOrderForUpload(null);
          }
        }}
      />
    </>
  );
};

export default PharmacyOrders;
