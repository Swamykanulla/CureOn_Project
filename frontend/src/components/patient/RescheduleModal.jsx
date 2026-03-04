import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock } from "lucide-react";
import { format, startOfToday } from "date-fns";
import { enUS, hi, te } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { appointmentsService } from "@/services/api";

const timeSlots = [];

const RescheduleModal = ({
  open,
  onOpenChange,
  appointmentDetails,
  onConfirm,
}) => {
  const { t, i18n } = useTranslation();
  const i18nText = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'hi': return hi;
      case 'te': return te;
      default: return enUS;
    }
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime && onConfirm) {
      onConfirm(selectedDate, selectedTime);
    }
    setSelectedDate(undefined);
    setSelectedTime("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime("");
    onOpenChange(false);
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (appointmentDetails?.doctorId && selectedDate) {
        setLoadingSlots(true);
        try {
          const dateStr = format(selectedDate, "yyyy-MM-dd", { locale: getDateLocale() });
          const res = await appointmentsService.getAvailableSlots(appointmentDetails.doctorId, dateStr);
          setSlots(res.slots || []);
        } catch {
          setSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      } else {
        setSlots([]);
      }
    };
    loadSlots();
  }, [appointmentDetails?.doctorId, selectedDate]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" style={{ direction: "rtl" }}>
        <div style={{ direction: "ltr" }}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t('common.reschedule')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
          {appointmentDetails && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">{t('appointments.currentAppointment')}:</p>
              <p className="font-medium text-foreground">
                {appointmentDetails.doctorName || appointmentDetails.patientName}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('common.appointmentTime', { date: appointmentDetails.currentDate, time: appointmentDetails.currentTime })}
              </p>
            </div>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>{i18nText('common.selectNewDate', 'Select New Date')}</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < startOfToday()}
              className={cn("rounded-md border pointer-events-auto")}
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label>{i18nText('common.selectNewTime', 'Select New Time')}</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder={i18nText('common.selectTimeSlot', 'Select Time Slot')}>
                  {loadingSlots ? (
                    <span className="text-muted-foreground">{i18nText('common.loading', 'Loading...')}</span>
                  ) : selectedTime && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedTime}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {slots.length > 0 ? (
                  slots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="no-slots">{i18nText('common.noSlots', 'No slots available')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedDate && selectedTime && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">{t('common.newAppointment')}</p>
              <p className="font-medium text-foreground">
                {t('common.appointmentTime', { 
                  date: format(selectedDate, "PP", { locale: getDateLocale() }), 
                  time: selectedTime 
                })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button
              variant="hero"
              onClick={handleConfirm}
              className="flex-1"
              disabled={!selectedDate || !selectedTime}
            >
              {t('common.confirm')}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleModal;
