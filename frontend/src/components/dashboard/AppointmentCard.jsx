import { Calendar, Clock, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const AppointmentCard = ({
  doctorName,
  patientName,
  specialty,
  date,
  time,
  type,
  status,
  avatar,
  showActions = true,
  customActions,
  userType = "patient",
  isPaid,
  paymentStatus,
  paymentTransactionId,
  onPay,
  onJoin,
  onReschedule,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const i18nText = (key, fallback) => {
    const val = t(key);
    return val === key ? fallback : val;
  };
  const statusStyles = {
    upcoming: "badge-pending",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };

  const name = userType === "patient" ? doctorName : patientName;

  const isCompleted = status === "completed";
  const isRejectedPayment = paymentStatus === "Rejected";
  const isApprovedPayment = paymentStatus === "Approved" || isPaid === true;
  const canShowPaymentAction = type === "video" && userType === "patient" && !isApprovedPayment && onPay;

  return (
    <div className={`dashboard-card p-5 ${isCompleted ? "bg-muted/30" : "hover-lift"}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-primary font-semibold">
              {name?.charAt(0) || "?"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="font-semibold text-foreground truncate">
                {userType === "patient" ? `${t('common.dr')} ${doctorName}` : patientName}
              </h4>
              {specialty && (
                <p className="text-sm text-muted-foreground">{specialty}</p>
              )}
            </div>
            <span className={`badge-status ${statusStyles[status]} capitalize`}>
              {t(`appointments.${status}`)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {type === "video" ? (
                <Video className="w-4 h-4 text-primary" />
              ) : (
                <MapPin className="w-4 h-4 text-accent" />
              )}
              <span className="capitalize">
                {type === 'video' ? t('common.video') : type === 'in-person' ? t('common.inPerson') : type}
              </span>
            </div>
          </div>
          {userType === "patient" && type === "video" && paymentStatus && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Payment Status:</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  paymentStatus === "Rejected"
                    ? "bg-red-100 text-red-700"
                    : paymentStatus === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {paymentStatus}
              </span>
              {paymentTransactionId && (
                <span className="text-muted-foreground">Txn: {paymentTransactionId}</span>
              )}
            </div>
          )}

          {showActions && status === "upcoming" && (
            <div className="flex items-center gap-2 mt-4">
              {canShowPaymentAction && (
                <Button size="sm" variant="hero" onClick={onPay}>
                  {isRejectedPayment ? "Pay Again" : i18nText('common.payNow', 'Pay Now')}
                </Button>
              )}
              {type === "video" && (
                <Button size="sm" variant="default" onClick={onJoin} disabled={userType === "patient" && isPaid !== true}>
                  {i18nText('common.joinCall', 'Join Call')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onReschedule}>
                {i18nText('common.reschedule', 'Reschedule')}
              </Button>
              {userType === "doctor" && (
                <Button size="sm" variant="hero" onClick={onComplete}>
                  {i18nText('appointments.complete', 'Completed ')}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onCancel}>
                {i18nText('common.cancel', 'Cancel')}
              </Button>
              
            </div>
          )}

          {customActions && (
            <div className="flex items-center gap-2 mt-4">
              {customActions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
