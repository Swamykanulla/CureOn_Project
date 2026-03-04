import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FlaskConical,
  FileBarChart,
  Microscope,
  History,
  Settings,
  Search,
  MoreVertical,
  Wrench,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Filter,
  Plus
} from "lucide-react";
import { equipmentService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsEquipment = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filters, setFilters] = useState({ status: [] });
  const [newEquipment, setNewEquipment] = useState({ asset_id: "", name: "", model: "", location: "" });
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  const [equipmentList, setEquipmentList] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const statusFilter = filters.status.length === 1 ? filters.status[0] : undefined;
        const data = await equipmentService.list({
          search: searchTerm,
          status: statusFilter,
        });
        const mapped = data.map((e) => ({
          id: e.id,
          asset_id: e.asset_id,
          name: e.name,
          model: e.model,
          location: e.location,
          status: toReadableStatus(e.status),
          nextMaintenance: e.next_maintenance || "—",
        }));
        setEquipmentList(mapped);
      } catch (err) {
        console.error("Failed to load equipment", err);
        toast.error("Failed to load equipment");
      }
    };
    load();
  }, [searchTerm, filters]);

  const filteredEquipment = equipmentList.filter(eq => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(eq.asset_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.model || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filters.status.length === 0 || filters.status.includes(eq.status);
    
    return matchesSearch && matchesStatus;
  });

  const handleFilterChange = (status) => {
    setFilters(prev => {
      const updated = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      return { status: updated };
    });
  };

  const handleAddEquipment = () => {
    setNewEquipment({ asset_id: "", name: "", model: "", location: "" });
    setIsAddDialogOpen(true);
  };

  const submitNewEquipment = async () => {
    if (!newEquipment.asset_id || !newEquipment.name || !newEquipment.model) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      const created = await equipmentService.create({
        asset_id: newEquipment.asset_id,
        name: newEquipment.name,
        model: newEquipment.model,
        location: newEquipment.location,
      });
      const newEntry = {
        id: created.id,
        asset_id: created.asset_id,
        name: created.name,
        model: created.model,
        location: created.location,
        status: toReadableStatus(created.status),
        nextMaintenance: created.next_maintenance || "—",
      };
      setEquipmentList((prev) => [newEntry, ...prev]);
      toast.success(`${newEquipment.name} added successfully`);
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error("Create equipment failed", err);
      toast.error("Failed to add equipment");
    }
  };

  const handleMaintenance = (eq) => {
    setSelectedEquipment(eq);
    setMaintenanceDate("");
    setMaintenanceNotes("");
    setIsMaintenanceDialogOpen(true);
  };

  const handleReport = (eq) => {
    setSelectedEquipment(eq);
    setIssueType("");
    setIssueDescription("");
    setIsReportDialogOpen(true);
  };

  const submitMaintenance = async () => {
    if (!maintenanceDate) {
      toast.error("Please select maintenance date");
      return;
    }
    try {
      const updated = await equipmentService.scheduleMaintenance(selectedEquipment.id, {
        next_maintenance: maintenanceDate,
        status: "MAINTENANCE",
        notes: maintenanceNotes,
      });
      setEquipmentList((prev) =>
        prev.map((e) =>
          e.id === selectedEquipment.id
            ? {
                ...e,
                status: toReadableStatus(updated.status),
                nextMaintenance: updated.next_maintenance || "—",
              }
            : e
        )
      );
      toast.success(`Maintenance scheduled for ${selectedEquipment.name}`);
      setIsMaintenanceDialogOpen(false);
    } catch (err) {
      console.error("Schedule maintenance failed", err);
      toast.error("Failed to schedule maintenance");
    }
  };

  const submitReport = async () => {
    if (!issueType || !issueDescription) {
      toast.error("Please provide issue type and description");
      return;
    }
    try {
      const updated = await equipmentService.reportIssue(selectedEquipment.id, {
        issue_type: issueType,
        description: issueDescription,
      });
      setEquipmentList((prev) =>
        prev.map((e) =>
          e.id === selectedEquipment.id
            ? { ...e, status: toReadableStatus(updated.status) }
            : e
        )
      );
      toast.error(`Issue reported for ${selectedEquipment.name}.`);
      setIsReportDialogOpen(false);
    } catch (err) {
      console.error("Report issue failed", err);
      toast.error("Failed to report issue");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Operational": return "text-green-600 bg-green-50 border-green-200";
      case "Maintenance": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Calibrating": return "text-blue-600 bg-blue-50 border-blue-200";
      case "Reported": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const toReadableStatus = (status) => {
    switch (status) {
      case "OPERATIONAL": return "Operational";
      case "MAINTENANCE": return "Maintenance";
      case "CALIBRATING": return "Calibrating";
      case "REPORTED": return "Reported";
      case "BROKEN": return "Broken";
      default: return status;
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Equipment Management</h1>
            <p className="text-muted-foreground mt-1">Monitor status and maintenance of lab instruments</p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={filters.status.length > 0 ? "bg-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Status</h4>
                  <div className="flex flex-col gap-2 mt-2">
                    {["Operational", "Maintenance", "Calibrating", "Reported"].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`status-${status}`} 
                          checked={filters.status.includes(status)}
                          onCheckedChange={() => handleFilterChange(status)}
                        />
                        <Label htmlFor={`status-${status}`}>{status}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => navigate("/labs/equipment/issues")}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reported Issues
            </Button>
            <Button onClick={handleAddEquipment}>
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search equipment..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Maintenance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-mono font-medium">{eq.asset_id}</TableCell>
                    <TableCell className="font-medium">{eq.name}</TableCell>
                    <TableCell>{eq.model}</TableCell>
                    <TableCell>{eq.location}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(eq.status)}`}>
                        {eq.status}
                      </span>
                    </TableCell>
                    <TableCell>{eq.nextMaintenance}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleMaintenance(eq)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReport(eq)} className="text-destructive focus:text-destructive">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Report Issue
                          </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={async () => {
                          try {
                            const ok = await equipmentService.remove(eq.id);
                            if (ok) {
                              setEquipmentList(prev => prev.filter(e => e.id !== eq.id));
                              toast.success(`Deleted ${eq.name}`);
                            } else {
                              toast.error("Failed to delete equipment");
                            }
                          } catch (err) {
                            toast.error("Failed to delete equipment");
                          }
                        }}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Delete Equipment
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

      {/* Add Equipment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Equipment</DialogTitle>
            <DialogDescription>
              Register a new instrument or device in the laboratory system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="eq-asset">Asset ID *</Label>
              <Input 
                id="eq-asset" 
                placeholder="e.g. EQ-001" 
                value={newEquipment.asset_id}
                onChange={(e) => setNewEquipment({...newEquipment, asset_id: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-name">Equipment Name *</Label>
              <Input 
                id="eq-name" 
                placeholder="e.g. Centrifuge C" 
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-model">Model *</Label>
              <Input 
                id="eq-model" 
                placeholder="e.g. Thermo Scientific X1" 
                value={newEquipment.model}
                onChange={(e) => setNewEquipment({...newEquipment, model: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eq-location">Location</Label>
              <Input 
                id="eq-location" 
                placeholder="e.g. Main Lab" 
                value={newEquipment.location}
                onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitNewEquipment}>Add Equipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Set a date for routine maintenance for {selectedEquipment?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance-date">Maintenance Date</Label>
              <Input 
                type="date" 
                id="maintenance-date" 
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Enter maintenance details..." 
                value={maintenanceNotes}
                onChange={(e) => setMaintenanceNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitMaintenance}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Issue Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Equipment Issue</DialogTitle>
            <DialogDescription>
              Report a malfunction or breakdown for {selectedEquipment?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <Input 
                id="issue-type" 
                placeholder="e.g. Calibration Error" 
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the problem in detail..." 
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReport}>Report Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LabsEquipment;
