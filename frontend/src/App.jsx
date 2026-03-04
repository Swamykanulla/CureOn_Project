import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ScrollToHashElement from "@/components/utils/ScrollToHashElement";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientAppointments from "./pages/patient/PatientAppointments";
import PatientRecords from "./pages/patient/PatientRecords";
import PatientPrescriptions from "./pages/patient/PatientPrescriptions";
import PatientChatbot from "./pages/patient/PatientChatbot";
import PatientSettings from "./pages/patient/PatientSettings";
import PatientProfile from "./pages/patient/PatientProfile";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorSettings from "./pages/doctor/DoctorSettings";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import DoctorRescheduleRequests from "./pages/doctor/DoctorRescheduleRequests";
import DoctorPatientDetails from "./pages/doctor/DoctorPatientDetails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminPharmacy from "./pages/admin/AdminPharmacy";
import AdminPharmacyDetails from "./pages/admin/AdminPharmacyDetails";
import AdminLabs from "./pages/admin/AdminLabs";
import AdminLabDetails from "./pages/admin/AdminLabDetails";
import AdminDoctorDetails from "./pages/admin/AdminDoctorDetails";
import AdminPatientDetails from "./pages/admin/AdminPatientDetails";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminPayments from "./pages/admin/AdminPayments";
import PharmacyDashboard from "./pages/pharmacy/PharmacyDashboard";
import PharmacyOrders from "./pages/pharmacy/PharmacyOrders";
import PharmacyInventory from "./pages/pharmacy/PharmacyInventory";
import PharmacyHistory from "./pages/pharmacy/PharmacyHistory";
import PharmacySettings from "./pages/pharmacy/PharmacySettings";
import PharmacyProfile from "./pages/pharmacy/PharmacyProfile";
import LabsDashboard from "./pages/labs/LabsDashboard";
import LabsRequests from "./pages/labs/LabsRequests";
import LabsResults from "./pages/labs/LabsResults";
import LabsEquipment from "./pages/labs/LabsEquipment";
import LabsEquipmentIssues from "./pages/labs/LabsEquipmentIssues";
import LabsHistory from "./pages/labs/LabsHistory";
import LabsSettings from "./pages/labs/LabsSettings";
import LabsProfile from "./pages/labs/LabsProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToHashElement />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/register" element={<Register />} />
          {/* Patient Routes */}
          <Route path="/patient/*" element={
            <ProtectedRoute allowedRoles={['PATIENT']}>
              <Routes>
                <Route path="dashboard" element={<PatientDashboard />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="records" element={<PatientRecords />} />
                <Route path="prescriptions" element={<PatientPrescriptions />} />
                <Route path="chatbot" element={<PatientChatbot />} />
                <Route path="settings" element={<PatientSettings />} />
                <Route path="profile" element={<PatientProfile />} />
              </Routes>
            </ProtectedRoute>
          } />
          {/* Doctor Routes */}
          <Route path="/doctor/*" element={
            <ProtectedRoute allowedRoles={['DOCTOR']}>
              <Routes>
                <Route path="dashboard" element={<DoctorDashboard />} />
                <Route path="appointments" element={<DoctorAppointments />} />
                <Route path="reschedule-requests" element={<DoctorRescheduleRequests />} />
                <Route path="patients" element={<DoctorPatients />} />
                <Route path="patients/:id" element={<DoctorPatientDetails />} />
                <Route path="availability" element={<DoctorAvailability />} />
                <Route path="settings" element={<DoctorSettings />} />
                <Route path="profile" element={<DoctorProfile />} />
              </Routes>
            </ProtectedRoute>
          } />
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="doctors" element={<AdminDoctors />} />
                <Route path="patients" element={<AdminPatients />} />
                <Route path="pharmacy" element={<AdminPharmacy />} />
                <Route path="pharmacies/:id" element={<AdminPharmacyDetails />} />
                <Route path="labs" element={<AdminLabs />} />
                <Route path="labs/:id" element={<AdminLabDetails />} />
                <Route path="doctors/:id" element={<AdminDoctorDetails />} />
                <Route path="patients/:id" element={<AdminPatientDetails />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="payments" element={<AdminPayments />} />
              </Routes>
            </ProtectedRoute>
          } />
          {/* Pharmacy Routes */}
          <Route path="/pharmacy/*" element={
            <ProtectedRoute allowedRoles={['PHARMACY']}>
              <Routes>
                <Route path="dashboard" element={<PharmacyDashboard />} />
                <Route path="orders" element={<PharmacyOrders />} />
                <Route path="inventory" element={<PharmacyInventory />} />
                <Route path="history" element={<PharmacyHistory />} />
                <Route path="settings" element={<PharmacySettings />} />
                <Route path="profile" element={<PharmacyProfile />} />
              </Routes>
            </ProtectedRoute>
          } />
          {/* Labs Routes */}
          <Route path="/labs/*" element={
            <ProtectedRoute allowedRoles={['LAB']}>
              <Routes>
                <Route path="dashboard" element={<LabsDashboard />} />
                <Route path="requests" element={<LabsRequests />} />
                <Route path="results" element={<LabsResults />} />
                <Route path="equipment" element={<LabsEquipment />} />
                <Route path="equipment/issues" element={<LabsEquipmentIssues />} />
                <Route path="history" element={<LabsHistory />} />
                <Route path="settings" element={<LabsSettings />} />
                <Route path="profile" element={<LabsProfile />} />
              </Routes>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
