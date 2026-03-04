import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { pharmacyService } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacyInventory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isUpdateStockOpen, setIsUpdateStockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stockUpdateValue, setStockUpdateValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total_items: 0, low_stock: 0, total_value: 0 });
  
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    stock: "",
    minStock: "",
    price: "",
    expiry: "",
    
  });
  const categories = [
    "Cardiac",
    "Dermatology",
    "Neuro",
    "Orthopedic",
    "Eye",
    "Pediatric",
    "General",
    "Antibiotics",
    "Painkiller",
    "Vitamins",
    "Psychiatry",
    "CNS",
    "ENT",
    "Otolaryngology",
    "Ear",
    "Nose",
    "Throat",
    "Gynecology",
    "Women",
    "OBGYN",
    "Urology",
    "Renal",
    "Urinary",
  ];

  const [inventory, setInventory] = useState([]);
  const formatINR = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [items, s] = await Promise.all([
          pharmacyService.inventory.list({
            search: searchTerm,
            category: categoryFilter,
            
            low_stock: lowStockOnly,
            expired: expiredOnly,
          }),
          pharmacyService.inventory.stats(),
        ]);
        setInventory(items || []);
        setStats(s || { total_items: 0, low_stock: 0, total_value: 0 });
      } catch (e) {
        toast.error("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchTerm, categoryFilter, lowStockOnly, expiredOnly]);

  const handleAddItem = async () => {
    try {
      const payload = {
        name: newItem.name,
        category: newItem.category,
        stock: parseInt(newItem.stock || 0),
        min_stock: parseInt(newItem.minStock || 0),
        price: parseFloat(newItem.price || 0),
        expiry: newItem.expiry || null,
        
      };
      await pharmacyService.inventory.create(payload);
      toast.success("New item added to inventory");
      setIsAddItemOpen(false);
      setNewItem({ name: "", category: "", stock: "", minStock: "", price: "", expiry: "" });
      const items = await pharmacyService.inventory.list();
      const s = await pharmacyService.inventory.stats();
      setInventory(items || []);
      setStats(s || stats);
    } catch (e) {
      toast.error("Failed to add item");
    }
  };

  const handleDelete = async (id) => {
    try {
      await pharmacyService.inventory.remove(id);
      setInventory((prev) => prev.filter((i) => i.id !== id));
      const s = await pharmacyService.inventory.stats();
      setStats(s || stats);
      toast.success("Item removed from inventory");
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setIsEditItemOpen(true);
  };

  const handleUpdateStockClick = (item) => {
    setSelectedItem(item);
    setStockUpdateValue("");
    setIsUpdateStockOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        name: selectedItem.name,
        category: selectedItem.category,
        stock: parseInt(selectedItem.stock || 0),
        min_stock: parseInt(selectedItem.min_stock ?? selectedItem.minStock ?? 0),
        price: parseFloat(selectedItem.price || 0),
        expiry: selectedItem.expiry || null,
        
      };
      const updated = await pharmacyService.inventory.update(selectedItem.id, payload);
      setInventory(inventory.map(item => item.id === updated.id ? updated : item));
      setIsEditItemOpen(false);
      toast.success("Item details updated successfully");
    } catch (e) {
      toast.error("Failed to update item");
    }
  };

  const handleSaveStock = async () => {
    const stockChange = parseInt(stockUpdateValue);
    if (isNaN(stockChange)) {
      toast.error("Please enter a valid number");
      return;
    }
    try {
      const updated = await pharmacyService.inventory.updateStock(selectedItem.id, { delta: stockChange });
      setInventory(inventory.map(item => item.id === updated.id ? updated : item));
      setIsUpdateStockOpen(false);
      toast.success("Stock updated successfully");
    } catch (e) {
      toast.error("Failed to update stock");
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory;
  }, [inventory]);

  return (
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Inventory Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Track stock levels and manage medicine supplies
            </p>
          </div>
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4 mr-2" />
                Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Enter the details for the new medicine or supply item.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      placeholder="Medicine Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={newItem.category} onValueChange={(v)=>setNewItem({...newItem, category: v})}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Current Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newItem.stock}
                      onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Min Stock Alert</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={newItem.minStock}
                      onChange={(e) => setNewItem({...newItem, minStock: e.target.value})}
                      placeholder="10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (INR)</Label>
                    <Input
                      id="price"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={newItem.expiry}
                      onChange={(e) => setNewItem({...newItem, expiry: e.target.value})}
                    />
                  </div>
                </div>
                
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddItem}>Add Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Edit Item Dialog */}
          <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Inventory Item</DialogTitle>
                <DialogDescription>
                  Update the details for this medicine or supply item.
                </DialogDescription>
              </DialogHeader>
              {selectedItem && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Item Name</Label>
                      <Input
                        id="edit-name"
                        value={selectedItem.name}
                        onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Category</Label>
                      <Select value={selectedItem.category} onValueChange={(v)=>setSelectedItem({...selectedItem, category: v})}>
                        <SelectTrigger id="edit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-stock">Current Stock</Label>
                      <Input
                        id="edit-stock"
                        type="number"
                        value={selectedItem.stock}
                        onChange={(e) => setSelectedItem({...selectedItem, stock: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-minStock">Min Stock Alert</Label>
                      <Input
                        id="edit-minStock"
                        type="number"
                        value={selectedItem.min_stock ?? selectedItem.minStock}
                        onChange={(e) => setSelectedItem({...selectedItem, min_stock: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Price (INR)</Label>
                      <Input
                        id="edit-price"
                        value={selectedItem.price}
                        onChange={(e) => setSelectedItem({...selectedItem, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-expiry">Expiry Date</Label>
                      <Input
                        id="edit-expiry"
                        type="date"
                        value={selectedItem.expiry}
                        onChange={(e) => setSelectedItem({...selectedItem, expiry: e.target.value})}
                      />
                    </div>
                  </div>
                  
                </div>
              )}
              <DialogFooter>
                <Button type="submit" onClick={handleSaveEdit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Update Stock Dialog */}
          <Dialog open={isUpdateStockOpen} onOpenChange={setIsUpdateStockOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Update Stock Level</DialogTitle>
                <DialogDescription>
                  Add or remove stock for {selectedItem?.name}. Use negative numbers to remove stock.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="current-stock" className="text-right">
                    Current
                  </Label>
                  <Input
                    id="current-stock"
                    value={selectedItem?.stock || 0}
                    disabled
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock-change" className="text-right">
                    Adjustment
                  </Label>
                  <Input
                    id="stock-change"
                    type="number"
                    value={stockUpdateValue}
                    onChange={(e) => setStockUpdateValue(e.target.value)}
                    className="col-span-3"
                    placeholder="+10 or -5"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleSaveStock}>Update Stock</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <h3 className="text-2xl font-bold">{stats.total_items}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-destructive">
                {stats.low_stock}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <h3 className="text-2xl font-bold">{formatINR.format(Number(stats.total_value || 0))}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-bold text-xs">INR</span>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(v => !v)}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          {filtersOpen && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Input value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} placeholder="e.g. Antibiotics" />
              </div>
              
              <label className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={lowStockOnly} onChange={(e)=>setLowStockOnly(e.target.checked)} />
                <span className="text-sm">Low Stock</span>
              </label>
              <label className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={expiredOnly} onChange={(e)=>setExpiredOnly(e.target.checked)} />
                <span className="text-sm">Expired</span>
              </label>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Details</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">#{item.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          item.stock <= (item.min_stock ?? item.minStock ?? 0) ? "text-destructive" : "text-green-600"
                        }`}>
                          {item.stock}
                        </span>
                        {item.stock <= (item.min_stock ?? item.minStock ?? 0) && (
                          <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                            Low
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatINR.format(Number(item.price || 0))}</TableCell>
                    <TableCell>{item.expiry}</TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(item)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStockClick(item)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PharmacyInventory;
