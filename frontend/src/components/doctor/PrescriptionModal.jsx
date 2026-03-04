import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pill } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { pharmacyService, userService } from "@/services/api";

const freqOptions = ["Early Morning", "Morning", "Afternoon", "Dinner", "After Dinner"];

const PrescriptionModal = ({ open, onOpenChange, appointment, onSubmit }) => {
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", frequency: [], duration: "", quantity: 1 }
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState({ open: false, index: null, query: "", results: [], loading: false });
  const debounceRef = useRef(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [doctorSpecialization, setDoctorSpecialization] = useState(null);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: "", frequency: [], duration: "", quantity: 1 }]);
  };

  const handleRemoveMedicine = (index) => {
    const newMedicines = medicines.filter((_, i) => i !== index);
    setMedicines(newMedicines);
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
  };

  useEffect(() => {
    if (open) {
      userService.listPharmacies().then((list) => setPharmacies(list || [])).catch(()=>setPharmacies([]));
      setDoctorSpecialization(appointment?.doctor_specialization || null);
    }
  }, [open, appointment]);

  useEffect(() => {
    if (!picker.open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await pharmacyService.catalog.list({ 
          q: picker.query, 
          pharmacy_id: selectedPharmacy?.id || selectedPharmacy || undefined,
          specialization: doctorSpecialization || undefined,
        });
        setPicker((p) => ({ ...p, results: res || [] }));
      } catch {
        setPicker((p) => ({ ...p, results: [] }));
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [picker.open, picker.query]);

  const handleSubmit = async () => {
    if (!diagnosis) {
      toast.error("Please enter a diagnosis");
      return;
    }
    if (!selectedPharmacy) {
      toast.error("Please select a pharmacy");
      return;
    }

    if (medicines.some(m => !m.name || !m.quantity || m.quantity <= 0)) {
      toast.error("Please specify medicine names");
      return;
    }

    setSubmitting(true);
    try {
      const { appointmentsService } = await import("@/services/api");
      const payload = {
        diagnosis,
        items: medicines.map(m => ({
          name: m.name,
          frequency: Array.isArray(m.frequency) ? m.frequency.join(", ") : (m.frequency || ""),
          duration: m.duration,
          quantity: Number(m.quantity || 1),
        })),
        notes,
        pharmacy: selectedPharmacy?.id || selectedPharmacy,
      };
      const result = await appointmentsService.prescriptions.create(appointment.id, payload);
      toast.success("Prescription sent successfully");
      if (onSubmit) {
        await onSubmit(result);
      }
      onOpenChange(false);
      setDiagnosis("");
      setMedicines([{ name: "", frequency: [], duration: "", quantity: 1 }]);
      setNotes("");
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        (Array.isArray(error?.response?.data?.non_field_errors) ? error.response.data.non_field_errors.join(", ") : null) ||
        (typeof error?.response?.data === "string" ? error.response.data : null);
      const firstItemError = (() => {
        const itemsErr = error?.response?.data?.items;
        if (Array.isArray(itemsErr) && itemsErr.length > 0) {
          const e0 = itemsErr[0];
          if (typeof e0 === "string") return e0;
          if (e0 && typeof e0 === "object") {
            const keys = Object.keys(e0);
            if (keys.length > 0 && Array.isArray(e0[keys[0]])) return e0[keys[0]].join(", ");
          }
        }
        return null;
      })();
      toast.error(detail || firstItemError || "Failed to submit prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Write Prescription for {appointment?.patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Pharmacy</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Select pharmacy"
                  readOnly
                  value={selectedPharmacy ? ((selectedPharmacy.first_name || "") + " " + (selectedPharmacy.last_name || "")).trim() || selectedPharmacy.username || "" : ""}
                />
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[320px]" align="start">
                <Command>
                  <CommandInput placeholder="Search pharmacy..." />
                  <CommandList>
                    <CommandEmpty>No pharmacies</CommandEmpty>
                    <CommandGroup>
                      {(pharmacies || []).map((ph) => (
                        <CommandItem key={ph.id} value={ph.username || String(ph.id)} onSelect={() => setSelectedPharmacy(ph)}>
                          <div className="flex flex-col">
                            <span className="font-medium">{(ph.first_name || "") + " " + (ph.last_name || "") || ph.username}</span>
                            <span className="text-xs text-muted-foreground">{ph.email || ""}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input 
              id="diagnosis" 
              placeholder="e.g. Acute Bronchitis" 
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Medicines</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMedicine}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </div>

            {medicines.map((medicine, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-lg">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Medicine Name</Label>
                  <Popover open={picker.open && picker.index === index} onOpenChange={(o)=>setPicker(p=>({ ...p, open:o, index:o?index:null }))}>
                    <PopoverTrigger asChild>
                      <Input
                        placeholder="Search medicine"
                        value={medicine.name}
                        onFocus={() => setPicker({ open: true, index, query: medicine.name || "", results: [], loading: false })}
                        onChange={(e) => {
                          handleMedicineChange(index, "name", e.target.value);
                          setPicker((p) => ({ ...p, open: true, index, query: e.target.value }));
                        }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[280px]" align="start">
                      <Command>
                        <CommandInput placeholder="Type to search..." value={picker.query} onValueChange={(v)=>setPicker(p=>({ ...p, query:v }))} />
                        <CommandList>
                          <CommandEmpty>No medicines found</CommandEmpty>
                          <CommandGroup>
                            {(picker.results || []).map((it) => (
                              <CommandItem
                                key={it.id}
                                value={it.name}
                                onSelect={() => {
                                  handleMedicineChange(index, "name", it.name);
                                  setPicker({ open: false, index: null, query: "", results: [], loading: false });
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{it.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {it.pharmacy_name ? `${it.pharmacy_name} • ` : ""}Stock: {it.stock ?? 0}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-6 space-y-1">
                  <Label className="text-xs">Frequency</Label>
                  <div className="flex flex-wrap gap-2">
                    {freqOptions.map((opt) => {
                      const checked = Array.isArray(medicine.frequency) && medicine.frequency.includes(opt);
                      return (
                        <label key={opt} className={`px-2 py-1 rounded-full text-xs cursor-pointer ${checked ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={(e) => {
                              const arr = new Set(Array.isArray(medicine.frequency) ? medicine.frequency : []);
                              if (e.target.checked) arr.add(opt); else arr.delete(opt);
                              handleMedicineChange(index, "frequency", Array.from(arr));
                            }}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input 
                    placeholder="5 days" 
                    value={medicine.duration}
                    onChange={(e) => handleMedicineChange(index, "duration", e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input 
                    type="number"
                    min={0}
                    value={medicine.quantity}
                    onChange={(e) => handleMedicineChange(index, "quantity", Math.max(0, parseInt(e.target.value || "0")))}
                  />
                </div>
                <div className="col-span-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveMedicine(index)}
                    disabled={medicines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Instructions, advice, or follow-up details..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Prescribing..." : "Submit Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionModal;
