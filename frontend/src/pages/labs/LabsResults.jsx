import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { appointmentsService } from "@/services/api";
import {
  LayoutDashboard,
  FlaskConical,
  FileBarChart,
  Microscope,
  History,
  Settings,
  Search,
  Filter,
  FileText,
  Upload,
  CheckCircle2,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsResults = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [resultData, setResultData] = useState({ value: "", range: "", comments: "" });
  const [sortOrder, setSortOrder] = useState("desc");
  const [filters, setFilters] = useState({
    status: [],
    priority: []
  });

  const [pendingTests, setPendingTests] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentsService.lab.listRequests();
        const mapped = (res || [])
          .filter(r => ["PENDING","IN_PROGRESS"].includes((r.status || "").toUpperCase()))
          .map(r => ({
            id: `LAB-${String(r.id).padStart(3,'0')}`,
            rawId: r.id,
            patient: r.patient_name,
            test: Array.isArray(r.tests) ? r.tests.join(", ") : String(r.tests || ""),
            doctor: `Dr. ${r.doctor_name}`,
            date: new Date(r.created_at).toISOString().split('T')[0],
            status: String(r.status || 'PENDING').toLowerCase().replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),
            priority: String(r.priority || 'ROUTINE').toLowerCase().replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),
          }));
        setPendingTests(mapped);
      } catch {
        setPendingTests([]);
      }
    };
    load();
  }, []);

  const handleOpenResultDialog = (test) => {
    setSelectedTest(test);
    setResultData({ value: "", range: "Normal", comments: "" });
    setIsResultDialogOpen(true);
  };

  const handleSubmitResult = async () => {
    if (!selectedTest) return;
    try {
      await appointmentsService.lab.submitResult(selectedTest.rawId, {
        result_value: resultData.value,
        reference_range: resultData.range,
        clinical_notes: resultData.comments,
        attachment: uploadFile,
      });
      setPendingTests(prev => prev.filter(t => t.id !== selectedTest.id));
      toast.success(`Results for ${selectedTest.test} submitted successfully`);
    } catch {
      toast.error("Failed to submit results");
    } finally {
      setIsResultDialogOpen(false);
      setUploadFile(null);
    }
  };

  const handleFilterChange = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

 
  const filteredTests = useMemo(() => pendingTests.filter(test => {
    const matchesSearch = 
      test.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status.length === 0 || filters.status.includes(test.status);
    const matchesPriority = filters.priority.length === 0 || filters.priority.includes(test.priority);
    
    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((a, b) => {
    if (sortOrder === "asc") {
      return a.date.localeCompare(b.date);
    }
    return b.date.localeCompare(a.date);
  }), [pendingTests, searchTerm, filters, sortOrder]);

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Test Results</h1>
            <p className="text-muted-foreground mt-1">Enter and manage laboratory test results</p>
          </div>
          <div className="flex gap-2">
            
            <Button variant="outline" onClick={handleSortToggle}>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={filters.status.length > 0 || filters.priority.length > 0 ? "bg-accent" : ""}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Status</h4>
                    <div className="flex flex-col gap-2">
                      {["Pending", "In Progress"].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`status-${status}`} 
                            checked={filters.status.includes(status)}
                            onCheckedChange={() => handleFilterChange("status", status)}
                          />
                          <Label htmlFor={`status-${status}`}>{status}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Priority</h4>
                    <div className="flex flex-col gap-2">
                      {["Routine", "Urgent"].map((priority) => (
                        <div key={priority} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`priority-${priority}`} 
                            checked={filters.priority.includes(priority)}
                            onCheckedChange={() => handleFilterChange("priority", priority)}
                          />
                          <Label htmlFor={`priority-${priority}`}>{priority}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search pending tests..." 
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
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length > 0 ? (
                  filteredTests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono font-medium">{test.id}</TableCell>
                      <TableCell>{test.patient}</TableCell>
                      <TableCell className="font-medium">{test.test}</TableCell>
                      <TableCell>{test.doctor}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          test.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {test.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={test.priority === "Urgent" ? "destructive" : "secondary"}>
                          {test.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleOpenResultDialog(test)} disabled={test.status !== "In Progress"}>
                          <FileText className="w-4 h-4 mr-2" />
                          Enter Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      No pending tests found. Good job!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Enter Test Results</DialogTitle>
            <DialogDescription>
              Record findings for {selectedTest?.test} - {selectedTest?.patient}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="result-value">Result Value</Label>
                <Input 
                  id="result-value" 
                  placeholder="e.g. 12.5 g/dL"
                  value={resultData.value}
                  onChange={(e) => setResultData({...resultData, value: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref-range">Reference Range</Label>
                <Input 
                  id="ref-range" 
                  placeholder="e.g. 11.0 - 16.0 g/dL"
                  value={resultData.range}
                  onChange={(e) => setResultData({...resultData, range: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments">Clinical Notes / Comments</Label>
              <Textarea 
                id="comments" 
                placeholder="Enter any observations or notes..."
                rows={4}
                value={resultData.comments}
                onChange={(e) => setResultData({...resultData, comments: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Attach File/Image</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitResult}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LabsResults;
