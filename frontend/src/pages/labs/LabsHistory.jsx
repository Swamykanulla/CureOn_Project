import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Download,
  Calendar,
  FileText
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await appointmentsService.lab.history.list({
          q: searchTerm || undefined,
          status: statusFilters,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        setRecords(data);
        if ((!searchTerm && statusFilters.length === 0 && !startDate && !endDate) && data.length === 0) {
          try {
            const back = await appointmentsService.lab.history.backfill();
            if (back?.created > 0) {
              const again = await appointmentsService.lab.history.list();
              setRecords(again);
              toast.success(`Imported ${back.created} past results into history`);
            }
          } catch {
            // ignore backfill error
          }
        }
      } catch (e) {
        toast.error("Failed to load lab history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchTerm, statusFilters, startDate, endDate]);

  const filteredHistory = useMemo(() => {
    return records.map(r => ({
      _id: r.id,
      id: r.test_id,
      date: r.date,
      patient: r.patient_name || r.patient,
      test: r.test_type,
      doctor: r.doctor_name || r.doctor,
      result: r.result_summary === "NORMAL" ? "Normal"
        : r.result_summary === "INFECTION_DETECTED" ? "Infection Detected"
        : "Abnormal",
    }));
  }, [records]);

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setIsDetailsOpen(true);
  };

  const handleExport = async () => {
    try {
      const blob = await appointmentsService.lab.history.exportCsv({
        q: searchTerm || undefined,
        status: statusFilters,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "lab_history.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Lab History</h1>
            <p className="text-muted-foreground mt-1">Archive of completed tests and reports</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDateDialogOpen(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search history..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsFilterDialogOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Filter Results
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Result Summary</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loading ? [] : filteredHistory).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">{record.id}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.patient}</TableCell>
                    <TableCell className="font-medium">{record.test}</TableCell>
                    <TableCell>{record.doctor}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        record.result.includes("Normal") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {record.result}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(record)}>
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Test Record Details</DialogTitle>
            <DialogDescription>
              Complete record for {selectedRecord?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Patient:</span>
                <span className="col-span-3">{selectedRecord.patient}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Date:</span>
                <span className="col-span-3">{selectedRecord.date}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Test:</span>
                <span className="col-span-3">{selectedRecord.test}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Doctor:</span>
                <span className="col-span-3">{selectedRecord.doctor}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-semibold text-right">Result:</span>
                <span className="col-span-3 font-bold">{selectedRecord.result}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
            <Button onClick={async () => {
              try {
                const blob = await appointmentsService.lab.history.downloadPdf(selectedRecord._id);
                const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedRecord.id}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setIsDetailsOpen(false);
              } catch {
                toast.error("Failed to download PDF");
              }
            }}>
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <div className="text-sm mb-1">Start Date</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">End Date</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); setIsDateDialogOpen(false); }}>Clear</Button>
            <Button onClick={() => setIsDateDialogOpen(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Filter Results</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {[
              { key: "NORMAL", label: "Normal" },
              { key: "ABNORMAL", label: "Abnormal" },
              { key: "INFECTION_DETECTED", label: "Infection Detected" },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={statusFilters.includes(opt.key)}
                  onChange={(e) => {
                    setStatusFilters(prev => e.target.checked ? [...prev, opt.key] : prev.filter(s => s !== opt.key));
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusFilters([])}>Clear</Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LabsHistory;
