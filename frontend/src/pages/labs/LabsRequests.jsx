import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FlaskConical,
  FileBarChart,
  Microscope,
  History,
  Settings,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { appointmentsService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [processAction, setProcessAction] = useState(null); // 'accept' or 'reject'
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' or 'asc'
  
  const [filters, setFilters] = useState({
    status: [],
    priority: []
  });

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await appointmentsService.lab.listRequests();
        const mapped = (res || []).map(r => ({
          id: `LAB-${String(r.id).padStart(3, '0')}`,
          rawId: r.id,
          patient: r.patient_name,
          doctor: `Dr. ${r.doctor_name}`,
          tests: r.tests || [],
          priority: (r.priority || 'ROUTINE'),               // store code: ROUTINE/URGENT
          priorityLabel: ((r.priority || 'ROUTINE').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())),
          status: (r.status || 'PENDING'),                   // store code: PENDING/IN_PROGRESS/COMPLETED/REJECTED
          statusLabel: ((r.status || 'PENDING').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())),
          date: new Date(r.created_at).toISOString().split('T')[0],
          time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setRequests(mapped);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFilterChange = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({ status: [], priority: [] });
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  const filteredRequests = useMemo(() => requests.filter(req => {
    const matchesSearch = 
      req.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.doctor.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status.length === 0 || filters.status.includes(req.status);
    const matchesPriority = filters.priority.length === 0 || filters.priority.includes(req.priority);

    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  }), [requests, searchTerm, filters, sortOrder]);

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setProcessAction(action);
    setIsProcessDialogOpen(true);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !processAction) return;

    const newStatus = processAction === 'accept' ? 'IN_PROGRESS' : 'REJECTED';
    try {
      await appointmentsService.lab.updateStatus(selectedRequest.rawId, newStatus);
      setRequests(prev => prev.map(req => req.id === selectedRequest.id ? { ...req, status: newStatus.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) } : req));
      toast.success(`Request ${selectedRequest.id} ${processAction === 'accept' ? 'accepted' : 'rejected'} successfully`);
    } catch {
      toast.error("Failed to update request");
    } finally {
      setIsProcessDialogOpen(false);
    }
  };

  const getPriorityColor = (priorityCode) => {
    return (priorityCode || '').toUpperCase() === "URGENT" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800";
  };

  const getStatusColor = (statusCode) => {
    switch((statusCode || '').toUpperCase()) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Test Requests</h1>
            <p className="text-muted-foreground mt-1">Manage incoming laboratory test requests</p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={filters.status.length > 0 || filters.priority.length > 0 ? "border-primary text-primary" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {(filters.status.length > 0 || filters.priority.length > 0) && (
                    <span className="ml-1 rounded-full bg-primary text-primary-foreground w-5 h-5 text-xs flex items-center justify-center">
                      {filters.status.length + filters.priority.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { code: "PENDING", label: "Pending" },
                        { code: "IN_PROGRESS", label: "In Progress" },
                        { code: "COMPLETED", label: "Completed" },
                        { code: "REJECTED", label: "Rejected" },
                      ].map(({ code, label }) => (
                        <div key={code} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`status-${code}`} 
                            checked={filters.status.includes(code)}
                            onCheckedChange={() => handleFilterChange("status", code)}
                          />
                          <Label htmlFor={`status-${code}`}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Priority</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { code: "ROUTINE", label: "Routine" },
                        { code: "URGENT", label: "Urgent" },
                      ].map(({ code, label }) => (
                        <div key={code} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`priority-${code}`} 
                            checked={filters.priority.includes(code)}
                            onCheckedChange={() => handleFilterChange("priority", code)}
                          />
                          <Label htmlFor={`priority-${code}`}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={toggleSort} variant={sortOrder === "desc" ? "default" : "secondary"}>
              <Clock className={`w-4 h-4 mr-2 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
              {sortOrder === "desc" ? "Newest First" : "Oldest First"}
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by patient, ID, or doctor..." 
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
                  <TableHead>Request ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono font-medium">{req.id}</TableCell>
                    <TableCell>{req.patient}</TableCell>
                    <TableCell>{req.doctor}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {req.tests.map((test, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {test}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(req.priority)}`}>
                        {req.priorityLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{req.date}</div>
                        <div className="text-muted-foreground text-xs">{req.time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                        {req.statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAction(req, 'accept')} 
                          disabled={(req.status || '') !== 'PENDING'}
                          title="Accept Request"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleAction(req, 'reject')} 
                          disabled={(req.status || '') !== 'PENDING'}
                          title="Reject Request"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewDetails(req)}
                          title="View Details"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === 'accept' ? 'Accept Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {processAction} request {selectedRequest?.id}?
              {processAction === 'accept' && " This will move the request to 'In Progress'."}
              {processAction === 'reject' && " This will mark the request as rejected."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={processAction === 'reject' ? "destructive" : "default"}
              onClick={confirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Full details for laboratory request {selectedRequest?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Patient</h4>
                  <p className="font-medium">{selectedRequest.patient}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Doctor</h4>
                  <p className="font-medium">{selectedRequest.doctor}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                  <p className="font-medium">{selectedRequest.date}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
                  <p className="font-medium">{selectedRequest.time}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedRequest.priority)}`}>
                    {selectedRequest.priority}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Requested Tests</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.tests.map((test, i) => (
                    <Badge key={i} variant="secondary">
                      {test}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedRequest.status === 'Pending' && (
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={() => {
                    setIsDetailsDialogOpen(false);
                    handleAction(selectedRequest, 'accept');
                  }}>
                    Accept
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => {
                    setIsDetailsDialogOpen(false);
                    handleAction(selectedRequest, 'reject');
                  }}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LabsRequests;
