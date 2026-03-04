import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

const LabRequestModal = ({ open, onOpenChange, appointment, onSubmit }) => {
  const [tests, setTests] = useState([""]);
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("ROUTINE");
  const [submitting, setSubmitting] = useState(false);
  const [labs, setLabs] = useState([]);
  const [selectedLab, setSelectedLab] = useState(null);

  useEffect(() => {
    import("@/services/api").then(async ({ userService }) => {
      try {
        const res = await userService.listLabs();
        setLabs(res || []);
      } catch {
        setLabs([]);
      }
    });
  }, []);

  const handleAddTest = () => setTests([...tests, ""]);
  const handleRemoveTest = (index) => setTests(tests.filter((_, i) => i !== index));
  const handleTestChange = (index, value) => {
    const next = [...tests];
    next[index] = value;
    setTests(next);
  };

  const handleSubmit = async () => {
    if (tests.some(t => !t.trim())) {
      toast.error("Please fill all test names");
      return;
    }
    if (!selectedLab) {
      toast.error("Please select a lab");
      return;
    }
    setSubmitting(true);
    try {
      const { appointmentsService } = await import("@/services/api");
      const payload = { tests, notes, priority, lab_id: selectedLab.id };
      const result = await appointmentsService.lab.create(appointment.id, payload);
      toast.success("Lab request sent");
      onOpenChange(false);
      setTests([""]);
      setNotes("");
      setPriority("ROUTINE");
      setSelectedLab(null);
      if (onSubmit) await onSubmit(result);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Failed to submit lab request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Request Lab Tests for {appointment?.patientName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label>Select Lab</Label>
            <div className="grid grid-cols-2 gap-2">
              {labs.map((lab) => (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setSelectedLab(lab)}
                  className={`p-2 rounded-lg border text-left ${selectedLab?.id === lab.id ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
                >
                  <div className="font-medium">{lab.username}</div>
                  <div className="text-xs text-muted-foreground">Lab</div>
                </button>
              ))}
              {labs.length === 0 && (
                <div className="text-sm text-muted-foreground">No labs available</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tests</Label>
            <div className="space-y-3">
              {tests.map((t, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <Input
                    placeholder="e.g. CBC, HbA1c"
                    value={t}
                    onChange={(e) => handleTestChange(i, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveTest(i)}
                    disabled={tests.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddTest}>
                <Plus className="w-4 h-4 mr-2" />
                Add Test
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-3">
              {["ROUTINE", "URGENT"].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    priority === p ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {p === "URGENT" ? "Urgent" : "Routine"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending..." : "Send to Lab"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabRequestModal;
