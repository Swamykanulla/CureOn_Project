import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  File,
  Image,
  Download,
  HeartPulse,
  Stethoscope,
  User,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { appointmentsService } from "@/services/api";

const PatientRecords = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];

  const defaultUserRecords = [
    { id: "u1", name: t('records.types.bloodTest'), placeholder: true },
    { id: "u3", name: t('records.types.prescription'), placeholder: true },
    { id: "u4", name: t('records.types.vaccination'), placeholder: true },
    { id: "u5", name: t('records.types.insurance'), placeholder: true },
  ];

  const [userRecords, setUserRecords] = useState({
    u1: null,
    u3: null,
    u4: null,
    u5: null,
  });

  const [doctorRecords, setDoctorRecords] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [otherUploads, setOtherUploads] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFile, setCustomFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentsService.lab.patientResults();
        const mapped = (res || []).map(r => ({
          id: `LAB-${String(r.id).padStart(3,'0')}`,
          name: Array.isArray(r.tests) ? r.tests.join(", ") : String(r.tests || "Lab Report"),
          type: "labReport",
          date: new Date(r.created_at),
          fileType: r.attachment ? (String(r.attachment).toLowerCase().endsWith('.pdf') ? 'pdf' : 'file') : 'none',
          size: "",
          uploadedBy: "lab",
          doctorName: `Dr. ${r.doctor_name}`,
          attachment: r.attachment,
          result_value: r.result_value,
          reference_range: r.reference_range,
          clinical_notes: r.clinical_notes,
        }));
        setDoctorRecords(mapped);
      } catch {
        setDoctorRecords([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadUploads = async () => {
      setLoadingUploads(true);
      try {
        const res = await appointmentsService.lab.patientUploads();
        const next = { u1: null, u2: null, u3: null, u4: null, u5: null };
        const others = [];
        (res || []).forEach(r => {
          const notes = String(r.clinical_notes || "");
          const m = notes.match(/\[REPORT_NAME:(.+?)\]/);
          const reportName = m ? m[1] : (Array.isArray(r.tests) ? String(r.tests[0]) : "Uploaded");
          const slot = defaultUserRecords.find(d => d.name === reportName);
          const mapped = {
            id: slot ? slot.id : `custom-${r.id}`,
            name: reportName,
            type: "uploaded",
            date: new Date(r.created_at),
            fileType: r.attachment ? (String(r.attachment).toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') : 'none',
            size: "",
            uploadedBy: "user",
            fileName: reportName,
            attachment: r.attachment,
          };
          if (slot) {
            next[slot.id] = mapped;
          } else {
            others.push(mapped);
          }
        });
        setUserRecords(next);
        setOtherUploads(others);
      } catch {
        setUserRecords(prev => prev);
      } finally {
        setLoadingUploads(false);
      }
    };
    loadUploads();
  }, []);

  const handleFileUpload = async (recordId, event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const record = defaultUserRecords.find(r => r.id === recordId);
      try {
        await appointmentsService.lab.patientUpload({
          report_name: record?.name || file.name,
          attachment: file,
        });
        const res = await appointmentsService.lab.patientUploads();
        const next = { u1: null, u2: null, u3: null, u4: null, u5: null };
        const others = [];
        (res || []).forEach(r => {
          const notes = String(r.clinical_notes || "");
          const m = notes.match(/\[REPORT_NAME:(.+?)\]/);
          const reportName = m ? m[1] : (Array.isArray(r.tests) ? String(r.tests[0]) : "Uploaded");
          const slot = defaultUserRecords.find(d => d.name === reportName);
          const mapped = {
            id: slot ? slot.id : `custom-${r.id}`,
            name: reportName,
            type: "uploaded",
            date: new Date(r.created_at),
            fileType: r.attachment ? (String(r.attachment).toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') : 'none',
            size: "",
            uploadedBy: "user",
            fileName: reportName,
            attachment: r.attachment,
          };
          if (slot) {
            next[slot.id] = mapped;
          } else {
            others.push(mapped);
          }
        });
        setUserRecords(next);
        setOtherUploads(others);
        toast.success(t('records.uploadSuccess', { name: record?.name || file.name }));
      } catch (err) {
        toast.error(err?.response?.data?.detail || t('records.uploadFailed'));
      } finally {
        event.target.value = "";
      }
    }
  };

  const handleCustomUpload = async () => {
    if (!customFile || !customName) {
      toast.info(t('records.chooseFile'));
      return;
    }
    try {
      await appointmentsService.lab.patientUpload({
        report_name: customName,
        attachment: customFile,
      });
      const res = await appointmentsService.lab.patientUploads();
      const next = { u1: null, u2: null, u3: null, u4: null, u5: null };
      const others = [];
      (res || []).forEach(r => {
        const notes = String(r.clinical_notes || "");
        const m = notes.match(/\[REPORT_NAME:(.+?)\]/);
        const reportName = m ? m[1] : (Array.isArray(r.tests) ? String(r.tests[0]) : "Uploaded");
        const slot = defaultUserRecords.find(d => d.name === reportName);
        const mapped = {
          id: slot ? slot.id : `custom-${r.id}`,
          name: reportName,
          type: "uploaded",
          date: new Date(r.created_at),
          fileType: r.attachment ? (String(r.attachment).toLowerCase().endsWith('.pdf') ? 'pdf' : 'image') : 'none',
          size: "",
          uploadedBy: "user",
          fileName: reportName,
          attachment: r.attachment,
        };
        if (slot) next[slot.id] = mapped; else others.push(mapped);
      });
      setUserRecords(next);
      setOtherUploads(others);
      setUploadOpen(false);
      setCustomName("");
      setCustomFile(null);
      toast.success(t('records.uploadSuccess', { name: customName }));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('records.uploadFailed'));
    }
  };

  const buildAttachmentUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };
  const handleDownload = (record) => {
    const url = buildAttachmentUrl(record.attachment);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(t('records.downloading', { name: record.name }));
    } else {
      toast.info(t('records.noFile'));
    }
  };

  const RecordCard = ({ record }) => (
    <div className="dashboard-card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {record.fileType === "pdf" ? (
            <File className="w-6 h-6 text-primary" />
          ) : (
            <Image className="w-6 h-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-medium text-foreground">{record.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>{t(`records.types.${record.type}`, record.type)}</span>
            <span>•</span>
            <span>{format(record.date, "PP", { locale: getDateLocale() })}</span>
            <span>•</span>
            <span>{record.size}</span>
            {record.doctorName && (
              <>
                <span>•</span>
                <span className="text-primary">{record.doctorName}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => handleDownload(record)}>
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );

  const UserRecordSlot = ({ recordDef, uploadedRecord }) => (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${uploadedRecord ? "bg-success/10" : "bg-muted"}`}>
            {uploadedRecord ? (
              uploadedRecord.fileType === "pdf" ? (
                <File className="w-6 h-6 text-success" />
              ) : (
                <Image className="w-6 h-6 text-success" />
              )
            ) : (
              <FileText className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-foreground">{recordDef.name}</h3>
            {uploadedRecord ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{uploadedRecord.fileName}</span>
                <span>•</span>
                <span>{format(uploadedRecord.date, "PP", { locale: getDateLocale() })}</span>
                <span>•</span>
                <span>{uploadedRecord.size}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('records.noFile')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadedRecord && (
            <Button variant="ghost" size="sm" onClick={() => handleDownload(uploadedRecord)}>
              <Download className="w-4 h-4" />
            </Button>
          )}
          <Label htmlFor={`file-${recordDef.id}`} className="cursor-pointer">
            <Input
              id={`file-${recordDef.id}`}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileUpload(recordDef.id, e)}
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploadedRecord ? t('records.update') : t('records.chooseFile')}
              </span>
            </Button>
          </Label>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      navItems={navItems}
      userType="patient"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {t('records.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('records.subtitle')}
          </p>
        </div>

        {/* Records Tabs */}
        <Tabs defaultValue="doctor" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="doctor" className="gap-2">
              <Stethoscope className="w-4 h-4" />
              {t('records.sharedByDoctor')} ({doctorRecords.length})
            </TabsTrigger>
            <TabsTrigger value="user" className="gap-2">
              <User className="w-4 h-4" />
              {t('records.myUploads')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="doctor" className="mt-6">
            <div className="space-y-4">
              {doctorRecords.length > 0 ? (
                doctorRecords.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))
              ) : (
                <div className="dashboard-card p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">{t('records.noRecordsDoctor')}</h3>
                  <p className="text-muted-foreground mt-2">
                    {t('records.noRecordsDoctorSub')}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="user" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  {t('records.chooseFile')}
                </Button>
              </div>
              {defaultUserRecords.map((recordDef) => (
                <UserRecordSlot
                  key={recordDef.id}
                  recordDef={recordDef}
                  uploadedRecord={userRecords[recordDef.id]}
                />
              ))}
              {otherUploads.length > 0 && (
                <div className="space-y-3">
                  {otherUploads.map((rec) => (
                    <RecordCard key={rec.id} record={rec} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('records.title')}</DialogTitle>
              <DialogDescription>{t('records.subtitle')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm">Report Name</Label>
                  <Input placeholder="e.g. MRI Scan" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Attach File/Image</Label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setCustomFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleCustomUpload}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PatientRecords;
