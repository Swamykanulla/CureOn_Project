import React, { useEffect, useState } from "react";
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { equipmentService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/labs/dashboard", icon: LayoutDashboard },
  { name: "Test Requests", href: "/labs/requests", icon: FlaskConical },
  { name: "Results", href: "/labs/results", icon: FileBarChart },
  { name: "Equipment", href: "/labs/equipment", icon: Microscope },
  { name: "History", href: "/labs/history", icon: History },
  { name: "Settings", href: "/labs/settings", icon: Settings },
];

const LabsEquipmentIssues = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const [issues, setIssues] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await equipmentService.list({ status: "REPORTED", search: searchTerm });
        const mapped = data.map((e) => ({
          id: e.id,
          equipmentId: e.asset_id,
          equipmentName: e.name,
          issueType: e.issue_type || "—",
          description: e.issue_description || "—",
          reportedBy: e.reported_by || null,
          reportedDate: e.updated_at?.slice(0, 10) || "—",
          status: "Reported",
        }));
        setIssues(mapped);
      } catch (err) {
        console.error("Failed to load issues", err);
        toast.error("Failed to load reported issues");
      }
    };
    load();
  }, [searchTerm]);

  const filteredIssues = issues.filter(issue => 
    issue.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.issueType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResolve = async (id) => {
    try {
      const updated = await equipmentService.resolveIssue(id, { status: "OPERATIONAL" });
      setIssues(issues.map(issue => 
        issue.id === id ? { ...issue, status: "Resolved" } : issue
      ));
      toast.success(`Issue ${id} marked as resolved`);
    } catch (e) {
      toast.error("Failed to resolve issue");
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case "High": return "destructive";
      case "Medium": return "warning"; // Assuming warning variant exists or use secondary
      case "Low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "Open": return "bg-red-100 text-red-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="labs">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/labs/equipment")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-3xl font-bold font-display text-foreground">Reported Issues</h1>
            </div>
            <p className="text-muted-foreground ml-10">Track and manage equipment malfunctions</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search issues..." 
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
                  <TableHead>Issue ID</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reported Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono font-medium">{issue.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{issue.equipmentName}</div>
                        <div className="text-xs text-muted-foreground">{issue.equipmentId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{issue.issueType}</TableCell>
                    <TableCell className="max-w-xs truncate" title={issue.description}>
                      {issue.description}
                    </TableCell>
                    <TableCell>{issue.reportedDate}</TableCell>
                    <TableCell>
                      <Badge variant={issue.priority === "High" ? "destructive" : "secondary"}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResolve(issue.id)} disabled={issue.status === 'Resolved'}>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                            Mark as Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Issue
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

export default LabsEquipmentIssues;
