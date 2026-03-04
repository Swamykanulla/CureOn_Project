import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentsService } from "@/services/api";

const navItems = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
  { name: "Patients", href: "/doctor/patients", icon: Users },
  { name: "Manage Availability", href: "/doctor/availability", icon: Clock },
  { name: "Settings", href: "/doctor/settings", icon: Settings },
];

const DoctorAvailability = () => {
  const weekdays = [
    { name: "Monday", index: 0 },
    { name: "Tuesday", index: 1 },
    { name: "Wednesday", index: 2 },
    { name: "Thursday", index: 3 },
    { name: "Friday", index: 4 },
    { name: "Saturday", index: 5 },
    { name: "Sunday", index: 6 },
  ];
  const [schedule, setSchedule] = useState(
    weekdays.map((w) => ({ day: w.name, enabled: false, slots: [] }))
  );
  const [loading, setLoading] = useState(false);
  const [initialBackendRanges, setInitialBackendRanges] = useState([]);

  const timeOptions = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
  ];

  const loadFromBackend = async () => {
    setLoading(true);
    try {
      const ranges = await appointmentsService.doctorAvailability.list();
      setInitialBackendRanges(ranges);
      const next = weekdays.map((w) => {
        const slots = ranges
          .filter((r) => r.weekday === w.index)
          .map((r) => ({
            id: `${w.index}-${r.start_time}-${r.end_time}`,
            start: r.start_time.slice(0, 5),
            end: r.end_time.slice(0, 5),
          }));
        return { day: w.name, enabled: slots.length > 0, slots };
      });
      setSchedule(next);
    } catch {
      // leave defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFromBackend();
  }, []);

  const toggleDay = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, enabled: !day.enabled } : day
      )
    );
  };

  const addSlot = (dayIndex) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              slots: [...day.slots, { id: Date.now().toString(), start: "09:00", end: "12:00" }],
            }
          : day
      )
    );
  };

  const removeSlot = (dayIndex, slotId) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? { ...day, slots: day.slots.filter((slot) => slot.id !== slotId) }
          : day
      )
    );
  };

  const updateSlot = (dayIndex, slotId, field, value) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              slots: day.slots.map((slot) =>
                slot.id === slotId ? { ...slot, [field]: value } : slot
              ),
            }
          : day
      )
    );
  };

  const handleSave = () => {
    const sync = async () => {
      setLoading(true);
      try {
        // Fetch latest from backend to compare
        const current = await appointmentsService.doctorAvailability.list();

        // Build desired slots map from UI
        const desired = [];
        schedule.forEach((d, idx) => {
          const weekday = weekdays[idx].index;
          if (d.enabled) {
            d.slots.forEach((s) => {
              desired.push({ weekday, start_time: s.start, end_time: s.end });
            });
          }
        });

        // Delete those present in backend but not in desired, or for disabled days
        for (const r of current) {
          const exists = desired.some(
            (d) =>
              d.weekday === r.weekday &&
              d.start_time === r.start_time.slice(0, 5) &&
              d.end_time === r.end_time.slice(0, 5)
          );
          if (!exists) {
            await appointmentsService.doctorAvailability.remove({
              weekday: r.weekday,
              start_time: r.start_time,
              end_time: r.end_time,
            });
          }
        }

        // Add desired slots (get_or_create prevents duplicates)
        for (const d of desired) {
          await appointmentsService.doctorAvailability.add(d);
        }

        toast.success("Availability schedule updated successfully");
        loadFromBackend();
      } catch (e) {
        toast.error("Failed to update availability");
      } finally {
        setLoading(false);
      }
    };
    sync();
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userType="doctor"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Manage Availability
            </h1>
            <p className="text-muted-foreground mt-1">
              Set your available days and time slots for appointments
            </p>
          </div>
          <Button variant="hero" onClick={handleSave} disabled={loading}>
            <Save className="w-5 h-5" />
            Save Changes
          </Button>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          {schedule.map((day, dayIndex) => (
            <div key={day.day} className="dashboard-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={() => toggleDay(dayIndex)}
                    id={`toggle-${day.day}`}
                  />
                  <Label
                    htmlFor={`toggle-${day.day}`}
                    className={`font-semibold text-lg ${
                      day.enabled ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {day.day}
                  </Label>
                </div>
                {day.enabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(dayIndex)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slot
                  </Button>
                )}
              </div>

              {day.enabled && day.slots.length > 0 && (
                <div className="space-y-3 ml-12">
                  {day.slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Select
                          value={slot.start}
                          onValueChange={(value) => updateSlot(dayIndex, slot.id, "start", value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">to</span>
                        <Select
                          value={slot.end}
                          onValueChange={(value) => updateSlot(dayIndex, slot.id, "end", value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeSlot(dayIndex, slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {day.enabled && day.slots.length === 0 && (
                <p className="text-sm text-muted-foreground ml-12">
                  No time slots added. Click "Add Slot" to set your availability.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="dashboard-card p-5 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Appointment Duration</h3>
              <p className="text-sm text-muted-foreground">
                Each appointment slot is 30 minutes by default. Patients can book within your available time slots.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorAvailability;
