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
import { Heart, Brain, Bone, Stethoscope, Eye, Baby, Smile, Clock, Video, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { startOfToday } from "date-fns";
import { enUS, hi, te } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { appointmentsService, userService } from "@/services/api";
import { toast } from "sonner";

const specializations = [
  { id: "general", name: "General Physician", icon: Stethoscope, description: "For general health checkups" },
  { id: "cardio", name: "Cardiologist", icon: Heart, description: "Heart and blood vessels" },
  { id: "neuro", name: "Neurologist", icon: Brain, description: "Brain and nervous system" },
  { id: "ortho", name: "Orthopedic", icon: Bone, description: "Bones and joints" },
  { id: "eye", name: "Ophthalmologist", icon: Eye, description: "Eye care specialist" },
  { id: "pedia", name: "Pediatrician", icon: Baby, description: "Child health specialist" },
  { id: "derma", name: "Dermatologist", icon: Smile, description: "Skin care specialist" },
  { id: "psych", name: "Psychiatrist", icon: Brain, description: "Mental health specialist" },
  { id: "ent", name: "ENT Specialist", icon: Stethoscope, description: "Ear, nose and throat" },
  { id: "gyn", name: "Gynecologist", icon: Stethoscope, description: "Women's health specialist" },
  { id: "uro", name: "Urologist", icon: Stethoscope, description: "Urinary tract specialist" },
];

const BookingModal = ({ open, onOpenChange, onBookingConfirmed }) => {
  const { t, i18n } = useTranslation();
  const i18nText = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    specialization: "",
    doctorId: null,
    date: undefined,
    time: "",
    visitType: "VIDEO_CALL",
  });
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'hi': return hi;
      case 'te': return te;
      default: return enUS;
    }
  };

  const handleSpecializationSelect = (id) => {
    setFormData((prev) => ({ ...prev, specialization: id }));
    const spec = specializations.find((s) => s.id === id);
    const query = spec?.name || id;
    userService.listDoctors(query).then(setDoctors).catch(() => setDoctors([]));
    setStep(2);
  };

  const handleDoctorSelect = (doctorId) => {
    setFormData((prev) => ({ ...prev, doctorId }));
  };

  useEffect(() => {
    const loadSlots = async () => {
      if (formData.doctorId && formData.date) {
        setLoadingSlots(true);
        try {
          const dateStr = format(formData.date, "yyyy-MM-dd");
          const res = await appointmentsService.getAvailableSlots(formData.doctorId, dateStr);
          setAvailableSlots(res.slots || []);
        } catch {
          setAvailableSlots([]);
        } finally {
          setLoadingSlots(false);
        }
      } else {
        setAvailableSlots([]);
      }
    };
    loadSlots();
  }, [formData.doctorId, formData.date]);

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!(formData.date && formData.time && formData.doctorId)) return;
    setSubmitting(true);
    try {
      const payload = {
        doctor_id: formData.doctorId,
        date: format(formData.date, "yyyy-MM-dd"),
        time_slot: formData.time,
        visit_type: formData.visitType,
      };
      const data = await appointmentsService.book(payload);
      onBookingConfirmed && onBookingConfirmed(data);
      setStep(1);
      setFormData({
        specialization: "",
        doctorId: null,
        date: undefined,
        time: "",
        visitType: "VIDEO_CALL",
      });
      onOpenChange(false);
    } catch (e) {
      let msg = "Failed to book appointment";
      const d = e?.response?.data;
      if (typeof d === "string") msg = d;
      else if (d?.detail) msg = d.detail;
      else if (d && typeof d === "object") {
        const firstKey = Object.keys(d)[0];
        if (firstKey && Array.isArray(d[firstKey]) && d[firstKey][0]) msg = d[firstKey][0];
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      specialization: "",
      doctorId: null,
      date: undefined,
      time: "",
      visitType: "VIDEO_CALL",
    });
    onOpenChange(false);
  };

  const selectedSpec = specializations.find((s) => s.id === formData.specialization);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === 1 ? i18nText('common.selectDoctorType', 'Select Doctor Type') : i18nText('common.chooseDateTime', 'Choose Date & Time')}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="py-4">
            <p className="text-muted-foreground mb-6">
              {i18nText('common.chooseDoctorDesc', 'Choose the type of doctor you need')}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {specializations.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => handleSpecializationSelect(spec.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:border-primary hover:bg-primary/5 ${
                    formData.specialization === spec.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <spec.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {t(`appointments.specialties.${spec.id}`) === `appointments.specialties.${spec.id}` ? spec.name : t(`appointments.specialties.${spec.id}`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`appointments.specialties.${spec.id}Desc`) === `appointments.specialties.${spec.id}Desc` ? spec.description : t(`appointments.specialties.${spec.id}Desc`)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            {/* Selected Doctor Type */}
            {selectedSpec && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <selectedSpec.icon className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">
                  {t(`appointments.specialties.${selectedSpec.id}`) === `appointments.specialties.${selectedSpec.id}` ? selectedSpec.name : t(`appointments.specialties.${selectedSpec.id}`)}
                </span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={handleBack}>
                      {i18nText('common.change', 'Change')}
                </Button>
              </div>
            )}

            {/* Choose Doctor */}
            <div className="space-y-2">
              <Label>{i18nText('common.selectDoctor', 'Select Doctor')}</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleDoctorSelect(doc.id)}
                    className={`p-3 rounded-lg border text-left transition ${
                      formData.doctorId === doc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                    }`}
                  >
                    <div className="font-medium text-foreground">
                      {(doc.first_name || doc.last_name) ? `${doc.first_name || ''} ${doc.last_name || ''}`.trim() : doc.username}
                    </div>
                    <div className="text-xs text-muted-foreground">{doc.specialization || t('appointments.specialties.availableDoctor')}</div>
                  </button>
                ))}
                {doctors.length === 0 && (
                  <div className="text-sm text-muted-foreground">{t('common.noDoctorsFound') || "No doctors found for this type"}</div>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>{i18nText('common.selectDate', 'Select Date')}</Label>
              <Calendar
                mode="single"
                selected={formData.date}
                onSelect={(date) => setFormData((prev) => ({ ...prev, date }))}
                disabled={(date) => date < startOfToday()}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>

            {/* Time Selection (from availability) */}
            <div className="space-y-2">
              <Label>{i18nText('common.selectTimeSlot', 'Select Time Slot')}</Label>
              <Select
                value={formData.time}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={i18nText('common.selectTimeSlot', 'Select Time Slot')}>
                    {loadingSlots ? (
                      <span className="text-muted-foreground">{i18nText('common.loading', 'Loading...')}</span>
                    ) : formData.time && (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formData.time}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(availableSlots || []).length > 0 ? (
                    (availableSlots || []).map((time) => (
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

            {/* Visit Type */}
            <div className="space-y-2">
              <Label>{i18nText('common.visitType', 'Visit Type')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`p-3 rounded-lg border flex items-center gap-2 ${formData.visitType === "VIDEO_CALL" ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setFormData((p) => ({ ...p, visitType: "VIDEO_CALL" }))}
                >
                  <Video className="w-4 h-4 text-primary" />
                  <span>Video Call</span>
                </button>
                <button
                  className={`p-3 rounded-lg border flex items-center gap-2 ${formData.visitType === "IN_PERSON" ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setFormData((p) => ({ ...p, visitType: "IN_PERSON" }))}
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>In-Person</span>
                </button>
              </div>
            </div>

            {/* Booking Summary */}
            {formData.date && formData.time && (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                <h4 className="font-medium text-foreground mb-2">{i18nText('common.bookingSummary', 'Booking Summary')}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{i18nText('common.doctor', 'Doctor')}: {selectedSpec ? t(`appointments.specialties.${selectedSpec.id}`) : ''}</p>
                  <p>{i18nText('common.date', 'Date')}: {format(formData.date, "PP", { locale: getDateLocale() })}</p>
                  <p>{i18nText('common.time', 'Time')}: {formData.time}</p>
                  <p>{i18nText('common.visitType', 'Visit Type')}: {formData.visitType === "VIDEO_CALL" ? "Video Call" : "In-Person"}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {i18nText('common.back', 'Back')}
              </Button>
              <Button
                variant="hero"
                onClick={handleSubmit}
                className="flex-1"
                disabled={submitting || !formData.date || !formData.time || !formData.doctorId}
              >
                {submitting ? i18nText('common.loading', 'Loading...') : i18nText('common.confirm', 'Confirm')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
