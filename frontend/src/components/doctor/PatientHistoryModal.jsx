import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Pill, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appointmentsService } from "@/services/api";

const PatientHistoryModal = ({ open, onOpenChange, patient }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [Rx, setRx] = useState([]);
  const [labRecords, setLabRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!open || !patient?.id) return;
      setLoading(true);
      try {
        const data = await appointmentsService.doctorPatientHistory(patient.id);
        setPatientInfo(data.patient || null);
        setRx(data.prescriptions || []);
        setLabRecords(data.lab_results || []);
      } catch {
        setPatientInfo(null);
        setRx([]);
        setLabRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, patient?.id]);

  const buildAttachmentUrl = (path) => {
    if (!path) return null;
    const p = String(path);
    if (p.startsWith("http")) return p;
    if (p.startsWith("/media/")) return `https://cureon-backend-5j6u.onrender.com${p}`;
    return `https://cureon-backend-5j6u.onrender.com/media/${p}`;
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Future: implement backend upload to patient records
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Patient History - {patient?.name || "Patient"}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{(patientInfo?.age ?? patient?.age) || "-"} years old</span>
            <span>•</span>
            <span className="text-primary font-medium">{patient?.condition || "-"}</span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="prescriptions" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prescriptions" className="gap-2">
              <Pill className="w-4 h-4" />
              Prescriptions
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="w-4 h-4" />
              Records
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="prescriptions" className="mt-0 space-y-3">
              {Rx.length === 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
                  No prescriptions yet
                </div>
              )}
              {Rx.map((rx) => (
                <div key={rx.id} className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{rx.diagnosis || "Prescription"}</h4>
                      <p className="text-sm text-muted-foreground">Dr. {rx.doctor_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(rx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {(rx.items || []).map((item) => (
                    <div key={item.id} className="flex items-center gap-4 text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{item.dosage}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{item.duration}</span>
                    </div>
                  ))}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="records" className="mt-0 space-y-3">
              {/* Upload Button */}
              <div className="p-4 rounded-xl border-2 border-dashed border-border">
                <Label htmlFor="doctor-file-upload" className="cursor-pointer">
                  <Input
                    id="doctor-file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">Upload prescription or medical file</span>
                  </div>
                </Label>
              </div>

              {labRecords.length === 0 && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
                  No records yet
                </div>
              )}
              {labRecords.map((lr) => {
                const url = buildAttachmentUrl(lr.attachment);
                const name = Array.isArray(lr.tests) ? lr.tests.join(", ") : "Lab Report";
                return (
                  <div key={lr.id} className="p-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Lab Report</span>
                          <span>•</span>
                          <span>{new Date(lr.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="text-primary">Doctor</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={!url} asChild={!!url}>
                      {url ? (
                        <a href={url} download>
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <Download className="w-4 h-4 opacity-50" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PatientHistoryModal;
