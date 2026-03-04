import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Building2,
  Microscope,
  FlaskConical,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";
import { navItems } from "./AdminLabs"; // Assuming we can export navItems or redefine them

// Mock data for labs (matching AdminLabs.jsx)
const labsData = [
  { 
    id: "1", 
    name: "BioTest Diagnostics", 
    license: "LB-54321", 
    email: "info@biotest.com", 
    phone: "+1 (555) 123-4567", 
    address: "123 Main St, New York", 
    status: "active", 
    requests: 342,
    description: "Full-service diagnostic laboratory specializing in advanced pathology and genetic testing."
  },
  { 
    id: "2", 
    name: "QuickLab Services", 
    license: "LB-98765", 
    email: "contact@quicklab.com", 
    phone: "+1 (555) 234-5678", 
    address: "456 Oak Ave, Los Angeles", 
    status: "active", 
    requests: 120,
    description: "Rapid response laboratory for routine blood work and urinalysis."
  },
  { 
    id: "3", 
    name: "Advanced Path Labs", 
    license: "LB-24680", 
    email: "support@advancedpath.com", 
    phone: "+1 (555) 345-6789", 
    address: "789 Pine Ln, Chicago", 
    status: "pending", 
    requests: 0,
    description: "Specialized pathology center focusing on oncology and rare diseases."
  },
];

// Mock Equipment Data
const equipmentData = {
  "1": [
    { id: "EQ-001", name: "Hematology Analyzer", model: "Sysmex XN-550", status: "Operational", lastMaintenance: "2024-01-15" },
    { id: "EQ-002", name: "Centrifuge A", model: "Thermo Scientific", status: "Maintenance", lastMaintenance: "2023-12-20" },
    { id: "EQ-005", name: "PCR Machine", model: "Bio-Rad CFX96", status: "Operational", lastMaintenance: "2024-02-01" },
  ],
  "2": [
    { id: "EQ-003", name: "Microscope B", model: "Olympus CX23", status: "Operational", lastMaintenance: "2024-01-10" },
    { id: "EQ-004", name: "Chemistry Analyzer", model: "Beckman Coulter", status: "Calibrating", lastMaintenance: "2024-02-01" },
  ],
  "3": [
    { id: "EQ-006", name: "Tissue Processor", model: "Leica TP1020", status: "Operational", lastMaintenance: "2024-01-20" },
    { id: "EQ-007", name: "Microtome", model: "Thermo HM 355S", status: "Operational", lastMaintenance: "2024-01-25" },
  ]
};

// Mock Test Menu Data
const testMenuData = {
  "1": [
    { id: "T-001", name: "Complete Blood Count (CBC)", code: "CBC", price: "$25.00", turnaround: "24 hrs" },
    { id: "T-002", name: "Lipid Profile", code: "LIPID", price: "$45.00", turnaround: "24 hrs" },
    { id: "T-003", name: "Genetic Screening", code: "GEN-S", price: "$250.00", turnaround: "5-7 days" },
  ],
  "2": [
    { id: "T-004", name: "Urinalysis", code: "UA", price: "$15.00", turnaround: "4 hrs" },
    { id: "T-005", name: "Blood Glucose", code: "GLU", price: "$10.00", turnaround: "4 hrs" },
  ],
  "3": [
    { id: "T-006", name: "Biopsy Analysis", code: "BX-AN", price: "$150.00", turnaround: "3-5 days" },
    { id: "T-007", name: "Immunohistochemistry", code: "IHC", price: "$120.00", turnaround: "3-5 days" },
  ]
};

const AdminLabDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lab, setLab] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    // Find lab by ID
    const foundLab = labsData.find(l => l.id === id);
    if (foundLab) {
      setLab(foundLab);
      setEquipment(equipmentData[id] || []);
      setTests(testMenuData[id] || []);
    }
  }, [id]);

  if (!lab) {
    return (
      <DashboardLayout navItems={[]} userType="admin">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading lab details...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Use imported navItems from AdminLabs to ensure consistency
  
  const getStatusColor = (status) => {
    switch(status) {
      case "Operational": return "bg-green-100 text-green-800";
      case "Maintenance": return "bg-yellow-100 text-yellow-800";
      case "Calibrating": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout navItems={navItems} userType="admin">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/admin/labs")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Labs
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {lab.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display text-foreground">{lab.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <FileText className="w-4 h-4" />
                  <span>License: {lab.license}</span>
                  <span className="mx-2">•</span>
                  <Badge variant={lab.status === 'active' ? 'success' : 'warning'} className="capitalize">
                    {lab.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Contact Lab
              </Button>
              <Button variant="default">
                Edit Details
              </Button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="tests">Test Menu</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lab.requests}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time received</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Equipment Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipment.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered devices</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Available Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tests.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Types of tests offered</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{lab.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone Number</p>
                    <p className="text-sm text-muted-foreground">{lab.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{lab.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Lab</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lab.description}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="w-5 h-5 text-primary" />
                  Lab Equipment
                </CardTitle>
                <CardDescription>
                  List of registered equipment and their current status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Maintenance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipment.length > 0 ? (
                      equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.model}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell>{item.lastMaintenance}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No equipment registered for this lab.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Menu Tab */}
          <TabsContent value="tests" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  Available Tests
                </CardTitle>
                <CardDescription>
                  List of diagnostic tests offered by this laboratory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Turnaround Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.length > 0 ? (
                      tests.map((test) => (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium">{test.name}</TableCell>
                          <TableCell className="font-mono text-xs">{test.code}</TableCell>
                          <TableCell>{test.price}</TableCell>
                          <TableCell className="text-muted-foreground">{test.turnaround}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          No tests listed for this lab.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

import { Stethoscope, Users, Pill, Settings as SettingsIcon } from "lucide-react";

export default AdminLabDetails;
