from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Appointment, DoctorAvailability, Prescription, LabTestRequest, LabTestRecord
try:
    from pharmacy.models import InventoryItem, Transaction, PharmacyOrder
except Exception:
    InventoryItem = None
    Transaction = None
    PharmacyOrder = None
from .serializers import AppointmentSerializer, DoctorAvailabilitySerializer, PrescriptionSerializer, LabTestRequestSerializer, LabTestRecordSerializer
from accounts.permissions import IsPatient, IsDoctor, IsAdmin, IsPharmacy, IsLab, IsLabOrAdmin
from django.http import StreamingHttpResponse, FileResponse, HttpResponse
import csv
from io import StringIO, BytesIO
import os
from datetime import datetime
from accounts.models import Notification

User = get_user_model()


def _generate_slots(start_time, end_time, step_minutes=30):
    slots = []
    dt_start = datetime.combine(datetime.today().date(), start_time)
    dt_end = datetime.combine(datetime.today().date(), end_time)
    while dt_start < dt_end:
        slots.append(dt_start.time())
        dt_start += timedelta(minutes=step_minutes)
    return slots


class AvailableSlotsView(APIView):
    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        date_str = request.query_params.get("date")
        if not doctor_id or not date_str:
            return Response({"detail": "doctor_id and date are required"}, status=400)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date format"}, status=400)

        doctor = get_object_or_404(User, id=doctor_id, role="DOCTOR")
        weekday = target_date.weekday()
        ranges = DoctorAvailability.objects.filter(doctor=doctor, weekday=weekday)

        all_slots = []
        for rng in ranges:
            all_slots.extend(_generate_slots(rng.start_time, rng.end_time))

        booked = set(
            Appointment.objects.filter(doctor=doctor, date=target_date)
            .values_list("time_slot", flat=True)
        )
        now = timezone.localtime()
        if target_date == now.date():
            current_time = now.time()
            filtered = [s for s in all_slots if s not in booked and s > current_time]
        else:
            filtered = [s for s in all_slots if s not in booked]
        available = [s.strftime("%H:%M") for s in filtered]
        return Response({"doctor_id": doctor.id, "date": date_str, "slots": available})


class BookAppointmentView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        doctor_id = request.data.get("doctor_id")
        date = request.data.get("date")
        time_slot = request.data.get("time_slot")
        visit_type = request.data.get("visit_type") or Appointment.VisitType.VIDEO_CALL
        if not all([doctor_id, date, time_slot]):
            return Response({"detail": "doctor_id, date, time_slot required"}, status=400)

        try:
            doctor = User.objects.get(id=doctor_id, role="DOCTOR")
        except User.DoesNotExist:
            return Response({"detail": "Doctor not found"}, status=404)

        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=doctor, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=doctor, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Slot already booked"}, status=400)

        appt = Appointment.objects.create(
            patient=request.user, doctor=doctor, date=date_obj, time_slot=time_obj, visit_type=visit_type
        )
        try:
            Notification.objects.create(
                recipient=doctor,
                sender=request.user,
                type=Notification.Type.APPOINTMENT_BOOKED,
                title="New appointment booked",
                message=f"{request.user.username} booked {date} {time_slot}",
                data={"appointment_id": appt.id},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data, status=201)


class MyAppointmentsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        status_param = request.query_params.get("status")
        qs = Appointment.objects.filter(patient=request.user)
        if status_param:
            qs = qs.filter(status=status_param)
        data = AppointmentSerializer(qs.order_by("-date", "time_slot"), many=True).data
        return Response(data)


class CancelAppointmentView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status", "updated_at"])
        try:
            Notification.objects.create(
                recipient=appt.doctor,
                sender=request.user,
                type=Notification.Type.APPOINTMENT_STATUS,
                title="Appointment cancelled",
                message=f"{request.user.username} cancelled the appointment",
                data={"appointment_id": appt.id, "status": appt.status},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data)


class RescheduleRequestView(APIView):
    permission_classes = [IsPatient]

    def post(self, request, pk):
        requested_date = request.data.get("requested_date")
        requested_time_slot = request.data.get("requested_time_slot")
        if not requested_date or not requested_time_slot:
            return Response({"detail": "requested_date and requested_time_slot required"}, status=400)
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)

        try:
            date_obj = datetime.strptime(requested_date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(requested_time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=appt.doctor, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Requested slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=appt.doctor, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Requested slot already booked"}, status=400)

        appt.status = Appointment.Status.RESCHEDULE_REQUESTED
        appt.requested_date = date_obj
        appt.requested_time_slot = time_obj
        appt.save(update_fields=["status", "requested_date", "requested_time_slot", "updated_at"])
        try:
            Notification.objects.create(
                recipient=appt.doctor,
                sender=request.user,
                type=Notification.Type.RESCHEDULE_REQUEST,
                title="Reschedule requested",
                message=f"Requested {requested_date} {requested_time_slot}",
                data={"appointment_id": appt.id, "requested_date": requested_date, "requested_time_slot": requested_time_slot},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data)


class DoctorAvailabilityView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        qs = DoctorAvailability.objects.filter(doctor=request.user)
        return Response(DoctorAvailabilitySerializer(qs, many=True).data)

    def post(self, request):
        serializer = DoctorAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        weekday = serializer.validated_data["weekday"]
        start_time = serializer.validated_data["start_time"]
        end_time = serializer.validated_data["end_time"]
        obj, created = DoctorAvailability.objects.get_or_create(
            doctor=request.user, weekday=weekday, start_time=start_time, end_time=end_time
        )
        return Response(DoctorAvailabilitySerializer(obj).data, status=201 if created else 200)

    def delete(self, request):
        weekday = request.data.get("weekday")
        start_time = request.data.get("start_time")
        end_time = request.data.get("end_time")
        if weekday is None or not start_time or not end_time:
            return Response({"detail": "weekday, start_time, end_time required"}, status=400)
        try:
            obj = DoctorAvailability.objects.get(
                doctor=request.user, weekday=int(weekday), start_time=start_time, end_time=end_time
            )
            obj.delete()
            return Response(status=204)
        except DoctorAvailability.DoesNotExist:
            return Response({"detail": "Availability not found"}, status=404)


class DoctorAppointmentsView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        status_param = request.query_params.get("status")
        qs = Appointment.objects.filter(doctor=request.user)
        if status_param:
            qs = qs.filter(status=status_param)
        data = AppointmentSerializer(qs.order_by("-date", "time_slot"), many=True).data
        return Response(data)

class DoctorSetVideoLinkView(APIView):
    permission_classes = [IsDoctor]
    def post(self, request, pk):
        video_url = (request.data.get("video_url") or "").strip()
        if not video_url:
            return Response({"detail": "video_url is required"}, status=400)
        if not (video_url.startswith("https://meet.google.com/") or video_url.startswith("http://meet.google.com/")):
            return Response({"detail": "Provide a valid Google Meet link"}, status=400)
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        appt.video_url = video_url
        appt.save(update_fields=["video_url", "updated_at"])
        return Response(AppointmentSerializer(appt).data)

class DoctorWeeklyStatsView(APIView):
    permission_classes = [IsDoctor]
    def get(self, request):
        today = timezone.localdate()
        start = today - timedelta(days=today.weekday())
        days = []
        for i in range(7):
            d = start + timedelta(days=i)
            qs = Appointment.objects.filter(doctor=request.user, date=d)
            received = qs.count()
            completed = qs.filter(status=Appointment.Status.COMPLETED).count()
            label = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]
            days.append({"day": label, "date": d.isoformat(), "received": received, "completed": completed})
        return Response({"week_start": start.isoformat(), "days": days})
class DoctorPatientsListView(APIView):
    permission_classes = [IsDoctor]
    def get(self, request):
        appts = Appointment.objects.filter(doctor=request.user).order_by("-date")
        by_patient = {}
        for appt in appts:
            p = appt.patient
            pid = p.id
            entry = by_patient.get(pid)
            last_visit = appt.date
            if not entry:
                prof = getattr(p, "patient_profile", None)
                name = f"{getattr(p, 'first_name', '')} {getattr(p, 'last_name', '')}".strip() or p.username
                by_patient[pid] = {
                    "id": pid,
                    "name": name,
                    "email": getattr(p, "email", "") or "",
                    "phone": getattr(prof, "phone", "") if prof else "",
                    "age": getattr(prof, "age", None) if prof else None,
                    "last_visit": last_visit.isoformat(),
                    "total_visits": 1,
                    "condition": None,
                    "avatar": (str(getattr(p, "avatar", "")) or None),
                }
            else:
                entry["total_visits"] += 1
                try:
                    prev = datetime.strptime(entry["last_visit"], "%Y-%m-%d").date()
                except ValueError:
                    prev = datetime.fromisoformat(entry["last_visit"]).date() if "T" in entry["last_visit"] else last_visit
                if last_visit > prev:
                    entry["last_visit"] = last_visit.isoformat()
        # enrich condition from latest prescription per patient with this doctor
        for pid, entry in by_patient.items():
            presc = Prescription.objects.filter(patient_id=pid, doctor=request.user).order_by("-created_at").first()
            entry["condition"] = getattr(presc, "diagnosis", None)
        # sort by last_visit desc
        data = sorted(by_patient.values(), key=lambda x: x["last_visit"], reverse=True)
        return Response(data)

class DoctorPatientHistoryView(APIView):
    permission_classes = [IsDoctor]
    def get(self, request, patient_id):
        # Ensure this patient has a relationship with the doctor
        try:
            patient = User.objects.get(id=patient_id, role="PATIENT")
        except User.DoesNotExist:
            return Response({"detail": "Patient not found"}, status=404)
        if not Appointment.objects.filter(doctor=request.user, patient=patient).exists():
            return Response({"detail": "No relationship with this patient"}, status=403)
        prof = getattr(patient, "patient_profile", None)
        last_appt = Appointment.objects.filter(doctor=request.user, patient=patient).order_by("-date").first()
        patient_info = {
            "id": patient.id,
            "name": f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or patient.username,
            "email": getattr(patient, "email", "") or "",
            "phone": getattr(prof, "phone", "") if prof else "",
            "age": getattr(prof, "age", None) if prof else None,
            "gender": getattr(prof, "gender", None) if prof else None,
            "last_visit": last_appt.date.isoformat() if last_appt else None,
            "date_of_birth": getattr(prof, "date_of_birth", None) if prof else None,
            "blood_type": getattr(prof, "blood_type", None) if prof else None,
            "height_cm": getattr(prof, "height_cm", None) if prof else None,
            "weight_kg": getattr(prof, "weight_kg", None) if prof else None,
            "allergies": getattr(prof, "allergies", None) if prof else None,
            "chronic_diseases": getattr(prof, "chronic_diseases", None) if prof else None,
            "address": getattr(prof, "address", None) if prof else None,
            "avatar": (str(getattr(patient, "avatar", "")) or None),
        }
        appointments = Appointment.objects.filter(patient=patient).order_by("-date", "time_slot")
        prescs = Prescription.objects.filter(patient=patient).order_by("-created_at")
        labs = LabTestRequest.objects.filter(patient=patient).order_by("-created_at")
        return Response({
            "patient": patient_info,
            "appointments": AppointmentSerializer(appointments, many=True).data,
            "prescriptions": PrescriptionSerializer(prescs, many=True).data,
            "lab_results": LabTestRequestSerializer(labs, many=True).data,
        })

class DoctorUpdateAppointmentStatusView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        new_status = request.data.get("status")
        if new_status not in [Appointment.Status.COMPLETED, Appointment.Status.CANCELLED, Appointment.Status.UPCOMING]:
            return Response({"detail": "Invalid status"}, status=400)
        appt.status = new_status
        appt.save(update_fields=["status", "updated_at"])
        try:
            Notification.objects.create(
                recipient=appt.patient,
                sender=request.user,
                type=Notification.Type.APPOINTMENT_STATUS,
                title="Appointment status updated",
                message=f"Status changed to {new_status}",
                data={"appointment_id": appt.id, "status": new_status},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data)

class DoctorRescheduleDecisionView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        decision = request.data.get("decision")  # "ACCEPT" or "REJECT"
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        if appt.status != Appointment.Status.RESCHEDULE_REQUESTED:
            return Response({"detail": "No reschedule requested for this appointment"}, status=400)

        if decision == "ACCEPT":
            if not appt.requested_date or not appt.requested_time_slot:
                return Response({"detail": "Missing requested date/time"}, status=400)
            appt.date = appt.requested_date
            appt.time_slot = appt.requested_time_slot
        elif decision == "REJECT":
            pass
        else:
            return Response({"detail": "decision must be ACCEPT or REJECT"}, status=400)

        appt.status = Appointment.Status.UPCOMING
        appt.requested_date = None
        appt.requested_time_slot = None
        appt.save(update_fields=["date", "time_slot", "status", "requested_date", "requested_time_slot", "updated_at"])
        try:
            Notification.objects.create(
                recipient=appt.patient,
                sender=request.user,
                type=Notification.Type.APPOINTMENT_STATUS,
                title="Reschedule decision made",
                message=f"Decision: {decision}",
                data={"appointment_id": appt.id, "decision": decision},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data)

class DoctorRescheduleView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        new_date = request.data.get("date")
        new_time_slot = request.data.get("time_slot")
        if not new_date or not new_time_slot:
            return Response({"detail": "date and time_slot required"}, status=400)
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        try:
            date_obj = datetime.strptime(new_date, "%Y-%m-%d").date()
            time_obj = datetime.strptime(new_time_slot, "%H:%M").time()
        except ValueError:
            return Response({"detail": "Invalid date/time format"}, status=400)

        weekday = date_obj.weekday()
        has_range = DoctorAvailability.objects.filter(
            doctor=request.user, weekday=weekday, start_time__lte=time_obj, end_time__gt=time_obj
        ).exists()
        if not has_range:
            return Response({"detail": "Slot not within doctor's availability"}, status=400)

        if Appointment.objects.filter(doctor=request.user, date=date_obj, time_slot=time_obj).exists():
            return Response({"detail": "Slot already booked"}, status=400)

        appt.date = date_obj
        appt.time_slot = time_obj
        appt.status = Appointment.Status.UPCOMING
        appt.requested_date = None
        appt.requested_time_slot = None
        appt.save(update_fields=["date", "time_slot", "status", "requested_date", "requested_time_slot", "updated_at"])
        try:
            Notification.objects.create(
                recipient=appt.patient,
                sender=request.user,
                type=Notification.Type.APPOINTMENT_STATUS,
                title="Appointment rescheduled",
                message=f"New time {new_date} {new_time_slot}",
                data={"appointment_id": appt.id, "date": new_date, "time_slot": new_time_slot},
            )
        except Exception:
            pass
        return Response(AppointmentSerializer(appt).data)


class AdminAllAppointmentsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Appointment.objects.all().order_by("-date", "time_slot")
        return Response(AppointmentSerializer(qs, many=True).data)


class AdminRescheduleDecisionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        decision = request.data.get("decision")  # "ACCEPT" or "REJECT"
        appt = get_object_or_404(Appointment, pk=pk)
        if appt.status != Appointment.Status.RESCHEDULE_REQUESTED:
            return Response({"detail": "No reschedule requested for this appointment"}, status=400)

        if decision == "ACCEPT":
            if not appt.requested_date or not appt.requested_time_slot:
                return Response({"detail": "Missing requested date/time"}, status=400)
            appt.date = appt.requested_date
            appt.time_slot = appt.requested_time_slot
        elif decision == "REJECT":
            pass
        else:
            return Response({"detail": "decision must be ACCEPT or REJECT"}, status=400)

        appt.status = Appointment.Status.UPCOMING
        appt.requested_date = None
        appt.requested_time_slot = None
        appt.save(update_fields=["date", "time_slot", "status", "requested_date", "requested_time_slot", "updated_at"])
        return Response(AppointmentSerializer(appt).data)


class AdminCancelAppointmentView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk)
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status", "updated_at"])
        return Response(AppointmentSerializer(appt).data)

class StripeCreateCheckoutView(APIView):
    permission_classes = [IsPatient]
    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)
        if appt.visit_type != Appointment.VisitType.VIDEO_CALL:
            return Response({"detail": "Payment required only for video call"}, status=400)
        if appt.is_paid:
            return Response({"detail": "Already paid"}, status=200)
        try:
            import stripe
        except Exception as e:
            return Response({"detail": f"Stripe import failed: {e.__class__.__name__}: {e}"}, status=400)
        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            return Response({"detail": "Stripe secret not configured"}, status=400)
        stripe.api_key = secret
        origin = request.headers.get("Origin") or request.META.get("HTTP_ORIGIN") or "http://localhost:5173"
        success = f"{origin}/patient/appointments?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel = f"{origin}/patient/appointments?payment=cancel"
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": "Video Consultation"},
                        "unit_amount": int(os.environ.get("APPOINTMENT_PRICE_CENTS", "2000")),
                    },
                    "quantity": 1,
                }],
                success_url=success,
                cancel_url=cancel,
                metadata={"appointment_id": str(appt.id), "patient_id": str(request.user.id)},
            )
            return Response({"url": session.get("url")})
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class StripeSuccessView(APIView):
    permission_classes = [IsPatient]
    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response({"detail": "session_id required"}, status=400)
        try:
            import stripe
        except Exception as e:
            return Response({"detail": f"Stripe import failed: {e.__class__.__name__}: {e}"}, status=400)
        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            return Response({"detail": "Stripe secret not configured"}, status=400)
        stripe.api_key = secret
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            if session.get("payment_status") != "paid":
                return Response({"detail": "Payment not completed"}, status=400)
            meta = session.get("metadata") or {}
            appt_id = meta.get("appointment_id")
            if not appt_id:
                return Response({"detail": "Missing appointment"}, status=400)
            appt = get_object_or_404(Appointment, pk=appt_id, patient=request.user)
            if not appt.is_paid:
                appt.is_paid = True
                appt.save(update_fields=["is_paid", "updated_at"])
            return Response(AppointmentSerializer(appt).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class StripeConfigView(APIView):
    permission_classes = [IsPatient]
    def get(self, request):
        pk = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
        return Response({"public_key": pk})

class StripeCreatePaymentIntentView(APIView):
    permission_classes = [IsPatient]
    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, patient=request.user)
        if appt.visit_type != Appointment.VisitType.VIDEO_CALL:
            return Response({"detail": "Payment required only for video call"}, status=400)
        if appt.is_paid:
            return Response({"detail": "Already paid"}, status=200)
        try:
            import stripe
        except Exception as e:
            return Response({"detail": f"Stripe import failed: {e.__class__.__name__}: {e}"}, status=400)
        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            return Response({"detail": "Stripe secret not configured"}, status=400)
        stripe.api_key = secret
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(os.environ.get("APPOINTMENT_PRICE_CENTS", "2000")),
                currency="usd",
                metadata={"appointment_id": str(appt.id), "patient_id": str(request.user.id)},
                automatic_payment_methods={"enabled": True},
            )
            return Response({"client_secret": intent.get("client_secret"), "payment_intent_id": intent.get("id")})
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class StripeVerifyPaymentIntentView(APIView):
    permission_classes = [IsPatient]
    def post(self, request):
        pi = request.data.get("payment_intent_id")
        if not pi:
            return Response({"detail": "payment_intent_id required"}, status=400)
        try:
            import stripe
        except Exception as e:
            return Response({"detail": f"Stripe import failed: {e.__class__.__name__}: {e}"}, status=400)
        secret = os.environ.get("STRIPE_SECRET_KEY")
        if not secret:
            return Response({"detail": "Stripe secret not configured"}, status=400)
        stripe.api_key = secret
        try:
            intent = stripe.PaymentIntent.retrieve(pi)
            status = intent.get("status")
            if status not in ("succeeded", "processing"):
                # return status so client can display clear message
                return Response({"status": status, "detail": f"Payment not completed: {status}"}, status=202)
            appt_id = (intent.get("metadata") or {}).get("appointment_id")
            appt = get_object_or_404(Appointment, pk=appt_id, patient=request.user)
            if status == "succeeded" and not appt.is_paid:
                appt.is_paid = True
                appt.save(update_fields=["is_paid", "updated_at"])
            return Response({"status": status, "appointment": AppointmentSerializer(appt).data})
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

class DoctorCreatePrescriptionView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        if Prescription.objects.filter(appointment=appt).exists():
            return Response({"detail": "Prescription already exists"}, status=400)
        data = request.data.copy()
        data["appointment"] = appt.id
        serializer = PrescriptionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        # Validate specialization restrictions before save
        try:
            spec = getattr(getattr(request.user, "doctor_profile", None), "specialization", None)
            spec_map = {
                "Cardiologist": ["Cardiac", "Heart"],
                "Dermatologist": ["Skin", "Dermatology"],
                "Neurologist": ["Neuro", "Neurology"],
                "Orthopedic": ["Orthopedic", "Bones"],
                "Ophthalmologist": ["Eye", "Ophthalmology"],
                "Pediatrician": ["Pediatric", "Children"],
                "Psychiatrist": ["Psychiatry", "CNS", "Neuro"],
                "ENT Specialist": ["ENT", "Otolaryngology", "Ear", "Nose", "Throat"],
                "Gynecologist": ["Gynecology", "Women", "OBGYN"],
                "Urologist": ["Urology", "Renal", "Urinary"],
                "General Physician": ["General", "Antibiotics", "Painkiller", "Vitamins"],
            }
            cats = []
            for k, v in spec_map.items():
                if spec and k.lower() in str(spec).lower():
                    cats = v
                    break
            if cats:
                from pharmacy.models import InventoryItem
                for it in data.get("items", []):
                    name = (it or {}).get("name")
                    inv = InventoryItem.objects.filter(name__iexact=name).first()
                    if inv:
                        ok = any([c.lower() in (inv.category or "").lower() for c in cats])
                        if not ok:
                            return Response({"detail": f"Medicine '{name}' not allowed for specialization '{spec}'"}, status=400)
        except Exception:
            pass
        presc = serializer.save(patient=appt.patient, doctor=request.user, appointment=appt)
        # Auto-create pharmacy orders based on inventory ownership
        try:
            from pharmacy.models import InventoryItem
            from django.contrib.auth import get_user_model
            from pharmacy.services import create_order_from_prescription
            User = get_user_model()
            # find target pharmacies from inventory items by name
            owners = {}
            for it in presc.items.all():
                inv = InventoryItem.objects.filter(name__iexact=it.name).first()
                owner = getattr(inv, "created_by", None) or getattr(presc, "pharmacy", None)
                if owner:
                    owners.setdefault(owner.id, owner)
            if not owners and getattr(presc, "pharmacy", None):
                owners[presc.pharmacy.id] = presc.pharmacy
            for _, pharm in owners.items():
                try:
                    create_order_from_prescription(presc, pharm, request.user)
                except Exception:
                    continue
        except Exception:
            pass
        try:
            Notification.objects.create(
                recipient=appt.patient,
                sender=request.user,
                type=Notification.Type.PRESCRIPTION_CREATED,
                title="Prescription created",
                message=f"Prescription for appointment #{appt.id}",
                data={"appointment_id": appt.id, "prescription_id": presc.id},
            )
        except Exception:
            pass
        try:
            owners = []
            if hasattr(presc, "pharmacy") and presc.pharmacy:
                owners.append(presc.pharmacy)
        except Exception:
            owners = []
        try:
            for pharm in owners:
                Notification.objects.create(
                    recipient=pharm,
                    sender=request.user,
                    type=Notification.Type.PHARMACY_STATUS,
                    title="New prescription assigned",
                    message=f"Prescription #{presc.id} assigned",
                    data={"prescription_id": presc.id},
                )
        except Exception:
            pass
        return Response(PrescriptionSerializer(presc).data, status=201)

class PatientPrescriptionsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        qs = Prescription.objects.filter(patient=request.user).order_by("-created_at")
        return Response(PrescriptionSerializer(qs, many=True).data)

class PharmacyPrescriptionsView(APIView):
    permission_classes = [IsPharmacy]

    def get(self, request):
        qs = Prescription.objects.all().order_by("-created_at")
        return Response(PrescriptionSerializer(qs, many=True).data)

class PharmacyUpdatePrescriptionStatusView(APIView):
    permission_classes = [IsPharmacy]

    def post(self, request, pk):
        presc = get_object_or_404(Prescription, pk=pk)
        new_status = request.data.get("status")
        valid = [s for s, _ in Prescription.PharmacyStatus.choices]
        if new_status not in valid:
            return Response({"detail": "Invalid status"}, status=400)
        presc.pharmacy_status = new_status
        if new_status == Prescription.PharmacyStatus.COMPLETED:
            presc.status = Prescription.Status.COMPLETED
        presc.save(update_fields=["pharmacy_status", "status", "updated_at"])
        try:
            Notification.objects.create(
                recipient=presc.patient,
                sender=request.user,
                type=Notification.Type.PHARMACY_STATUS,
                title="Prescription status updated",
                message=f"Status changed to {new_status}",
                data={"prescription_id": presc.id, "status": new_status},
            )
        except Exception:
            pass
        # Hook: create SALE transactions when order is completed
        if (
            new_status == Prescription.PharmacyStatus.COMPLETED
            and Transaction is not None
            and InventoryItem is not None
        ):
            try:
                # Skip if PharmacyOrder exists for this prescription (handled by order completion)
                if PharmacyOrder is not None and PharmacyOrder.objects.filter(prescription_id=presc.id, status__in=["PENDING", "ACCEPTED", "COMPLETED"]).exists():
                    return Response(PrescriptionSerializer(presc).data)
                # Idempotency: if we already created transactions for this order, skip
                existing = Transaction.objects.filter(details__icontains=f"Order #{presc.id}", type=Transaction.Type.SALE).exists()
                if not existing:
                    for it in presc.items.all():
                        try:
                            inv = InventoryItem.objects.filter(name__iexact=it.name).first()
                        except Exception:
                            inv = None
                        qty = int(it.quantity or 0)
                        amt = float((it.unit_price or 0) * (it.quantity or 0))
                        if inv and qty > 0:
                            Transaction.objects.create(
                                type=Transaction.Type.SALE,
                                details=f"Order #{presc.id} - {it.name}",
                                amount=amt,
                                status=Transaction.Status.COMPLETED,
                                user=request.user,
                                item=inv,
                                quantity=qty,
                            )
                    # If no items matched inventory, create an aggregate sale record without stock impact
                    # This keeps financials visible even if names don't match
                    if not Transaction.objects.filter(details__icontains=f"Order #{presc.id}", type=Transaction.Type.SALE).exists() and presc.total_amount:
                        Transaction.objects.create(
                            type=Transaction.Type.SALE,
                            details=f"Order #{presc.id} - Prescription Sale",
                            amount=float(presc.total_amount or 0),
                            status=Transaction.Status.COMPLETED,
                            user=request.user,
                        )
            except Exception:
                # Do not block status update if transaction creation fails
                pass
        return Response(PrescriptionSerializer(presc).data)

class PharmacyUpdatePrescriptionBillView(APIView):
    permission_classes = [IsPharmacy]

    def post(self, request, pk):
        presc = get_object_or_404(Prescription, pk=pk)
        items = request.data.get("items")
        if isinstance(items, str):
            import json
            try:
                items = json.loads(items)
            except Exception:
                return Response({"detail": "items must be JSON list"}, status=400)
        if not isinstance(items, list) or not items:
            return Response({"detail": "items list required"}, status=400)
        total = 0
        for incoming in items:
            item_id = incoming.get("id")
            unit_price = incoming.get("unit_price")
            quantity = incoming.get("quantity")
            if item_id is None or unit_price is None or quantity is None:
                return Response({"detail": "id, unit_price, quantity required per item"}, status=400)
            try:
                obj = presc.items.get(id=item_id)
            except Exception:
                return Response({"detail": f"Item {item_id} not found"}, status=404)
            obj.unit_price = unit_price
            obj.quantity = quantity
            obj.save(update_fields=["unit_price", "quantity"])
            total += float(unit_price) * int(quantity)
        presc.total_amount = total
        file = request.FILES.get("attachment")
        update_fields = ["total_amount", "updated_at"]
        if file:
            presc.bill_attachment = file
            update_fields.append("bill_attachment")
        presc.save(update_fields=update_fields)
        return Response(PrescriptionSerializer(presc).data)

class DoctorCreateLabRequestView(APIView):
    permission_classes = [IsDoctor]
    def post(self, request, pk):
        appt = get_object_or_404(Appointment, pk=pk, doctor=request.user)
        lab_id = request.data.get("lab_id")
        if not lab_id:
            return Response({"detail": "lab_id required"}, status=400)
        try:
            lab_user = User.objects.get(id=lab_id, role="LAB")
        except User.DoesNotExist:
            return Response({"detail": "Lab not found"}, status=404)
        data = {
            "appointment": appt.id,
            "tests": request.data.get("tests") or [],
            "notes": request.data.get("notes") or "",
            "priority": request.data.get("priority") or LabTestRequest.Priority.ROUTINE,
            "lab": lab_user.id,
        }
        if not isinstance(data["tests"], list) or len(data["tests"]) == 0:
            return Response({"detail": "tests list required"}, status=400)
        serializer = LabTestRequestSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(patient=appt.patient, doctor=request.user, lab=lab_user)
        try:
            Notification.objects.create(
                recipient=lab_user,
                sender=request.user,
                type=Notification.Type.LAB_REQUEST_CREATED,
                title="New lab request",
                message=", ".join(data.get("tests", [])),
                data={"lab_request_id": obj.id},
            )
            Notification.objects.create(
                recipient=appt.patient,
                sender=request.user,
                type=Notification.Type.LAB_REQUEST_CREATED,
                title="Lab tests ordered",
                message=", ".join(data.get("tests", [])),
                data={"lab_request_id": obj.id},
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(obj).data, status=201)

class LabRequestsView(APIView):
    permission_classes = [IsLab]
    def get(self, request):
        qs = LabTestRequest.objects.filter(lab=request.user).order_by("-created_at")
        return Response(LabTestRequestSerializer(qs, many=True).data)

class PatientLabResultsView(APIView):
    permission_classes = [IsPatient]
    def get(self, request):
        qs = LabTestRequest.objects.filter(
            patient=request.user,
            status=LabTestRequest.Status.COMPLETED,
            doctor__role=User.Role.DOCTOR
        ).order_by("-created_at")
        return Response(LabTestRequestSerializer(qs, many=True).data)

class LabUpdateRequestStatusView(APIView):
    permission_classes = [IsLab]
    def post(self, request, pk):
        req = get_object_or_404(LabTestRequest, pk=pk)
        new_status = request.data.get("status")
        valid = [s for s, _ in LabTestRequest.Status.choices]
        if new_status not in valid:
            return Response({"detail": "Invalid status"}, status=400)
        req.status = new_status
        req.save(update_fields=["status", "updated_at"])
        try:
            Notification.objects.create(
                recipient=req.patient,
                sender=request.user,
                type=Notification.Type.LAB_STATUS,
                title="Lab request status updated",
                message=f"Status changed to {new_status}",
                data={"lab_request_id": req.id, "status": new_status},
            )
            Notification.objects.create(
                recipient=req.doctor,
                sender=request.user,
                type=Notification.Type.LAB_STATUS,
                title="Lab request status updated",
                message=f"Status changed to {new_status}",
                data={"lab_request_id": req.id, "status": new_status},
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(req).data)

class LabSubmitResultView(APIView):
    permission_classes = [IsLab]
    def post(self, request, pk):
        req = get_object_or_404(LabTestRequest, pk=pk, lab=request.user)
        req.result_value = request.data.get("result_value") or ""
        req.reference_range = request.data.get("reference_range") or ""
        req.clinical_notes = request.data.get("clinical_notes") or ""
        file = request.FILES.get("attachment")
        if file:
            req.attachment = file
        req.status = LabTestRequest.Status.COMPLETED
        req.save()
        try:
            # Create history record if not exists
            if not hasattr(req, "record"):
                summary = "NORMAL"
                notes = (req.clinical_notes or "").lower()
                if "infection" in notes:
                    summary = "INFECTION_DETECTED"
                elif (req.result_value or "").strip().lower() not in ["", "normal"]:
                    summary = "ABNORMAL"
                LabTestRecord.objects.create(
                    request=req,
                    test_id=f"LAB-{req.id:03d}",
                    date=req.created_at.date(),
                    patient=req.patient,
                    doctor=req.doctor,
                    lab=req.lab,
                    test_type=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                    result_summary=summary,
                    result_details=req.clinical_notes or "",
                    attachment=req.attachment,
                )
        except Exception:
            pass
        try:
            Notification.objects.create(
                recipient=req.patient,
                sender=request.user,
                type=Notification.Type.LAB_RESULT_READY,
                title="Lab result ready",
                message=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                data={"lab_request_id": req.id},
            )
            Notification.objects.create(
                recipient=req.doctor,
                sender=request.user,
                type=Notification.Type.LAB_RESULT_READY,
                title="Lab result ready",
                message=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                data={"lab_request_id": req.id},
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(req).data)

class DoctorUploadLabResultView(APIView):
    permission_classes = [IsDoctor]
    def post(self, request, pk):
        req = get_object_or_404(LabTestRequest, pk=pk, doctor=request.user)
        req.result_value = request.data.get("result_value") or ""
        req.reference_range = request.data.get("reference_range") or ""
        notes = request.data.get("clinical_notes") or ""
        report_name = request.data.get("report_name") or ""
        tags = []
        if report_name:
            tags.append(f"[REPORT_NAME:{report_name}]")
        tags.append("[UPLOADED_BY_DOCTOR]")
        req.clinical_notes = ("\n".join([notes] + tags)).strip()
        file = request.FILES.get("attachment")
        if not file:
            return Response({"detail": "attachment required"}, status=400)
        req.attachment = file
        req.status = LabTestRequest.Status.COMPLETED
        # keep lab unchanged; uploaded_by inferred in serializer by presence of lab
        req.save()
        try:
            if not hasattr(req, "record"):
                summary = "NORMAL"
                notes_l = (req.clinical_notes or "").lower()
                if "infection" in notes_l:
                    summary = "INFECTION_DETECTED"
                elif (req.result_value or "").strip().lower() not in ["", "normal"]:
                    summary = "ABNORMAL"
                LabTestRecord.objects.create(
                    request=req,
                    test_id=f"LAB-{req.id:03d}",
                    date=req.created_at.date(),
                    patient=req.patient,
                    doctor=req.doctor,
                    lab=req.lab,
                    test_type=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                    result_summary=summary,
                    result_details=req.clinical_notes or "",
                    attachment=req.attachment,
                )
        except Exception:
            pass
        try:
            Notification.objects.create(
                recipient=req.patient,
                sender=request.user,
                type=Notification.Type.LAB_RESULT_READY,
                title="Report uploaded",
                message=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                data={"lab_request_id": req.id},
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(req).data)

class DoctorUploadAdhocReportView(APIView):
    permission_classes = [IsDoctor]
    def post(self, request, patient_id):
        try:
            patient = User.objects.get(id=patient_id, role="PATIENT")
        except User.DoesNotExist:
            return Response({"detail": "Patient not found"}, status=404)
        file = request.FILES.get("attachment")
        if not file:
            return Response({"detail": "attachment required"}, status=400)
        # Use latest appointment; if none, create a synthetic completed appointment now
        appt = Appointment.objects.filter(doctor=request.user, patient=patient).order_by("-date", "-time_slot").first()
        if not appt:
            now = timezone.localtime()
            appt = Appointment.objects.create(
                patient=patient,
                doctor=request.user,
                date=now.date(),
                time_slot=now.time().replace(microsecond=0),
                status=Appointment.Status.COMPLETED,
                visit_type=Appointment.VisitType.VIDEO_CALL,
            )
        report_name = request.data.get("report_name") or "Uploaded Report"
        notes = request.data.get("clinical_notes") or ""
        result_value = request.data.get("result_value") or ""
        reference_range = request.data.get("reference_range") or ""
        obj = LabTestRequest.objects.create(
            appointment=appt,
            patient=patient,
            doctor=request.user,
            lab=None,
            tests=[report_name],
            notes="",
            status=LabTestRequest.Status.COMPLETED,
            priority=LabTestRequest.Priority.ROUTINE,
            result_value=result_value,
            reference_range=reference_range,
            clinical_notes=(notes + f"\n[REPORT_NAME:{report_name}]\n[UPLOADED_BY_DOCTOR]").strip(),
            attachment=file,
        )
        try:
            Notification.objects.create(
                recipient=patient,
                sender=request.user,
                type=Notification.Type.LAB_RESULT_READY,
                title="Report uploaded",
                message=report_name,
                data={"lab_request_id": obj.id},
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(obj).data, status=201)

class PatientUploadsView(APIView):
    permission_classes = [IsPatient]
    def get(self, request):
        qs = LabTestRequest.objects.filter(patient=request.user, doctor=request.user).order_by("-created_at")
        return Response(LabTestRequestSerializer(qs, many=True).data)
    def post(self, request):
        file = request.FILES.get("attachment")
        if not file:
            return Response({"detail": "attachment required"}, status=400)
        report_name = request.data.get("report_name") or "Uploaded Document"
        notes = request.data.get("clinical_notes") or ""
        result_value = request.data.get("result_value") or ""
        reference_range = request.data.get("reference_range") or ""
        appt = Appointment.objects.filter(patient=request.user).order_by("-date", "-time_slot").first()
        if not appt:
            now = timezone.localtime()
            appt = Appointment.objects.create(
                patient=request.user,
                doctor=request.user,
                date=now.date(),
                time_slot=now.time().replace(microsecond=0),
                status=Appointment.Status.COMPLETED,
                visit_type=Appointment.VisitType.VIDEO_CALL,
            )
        obj = LabTestRequest.objects.create(
            appointment=appt,
            patient=request.user,
            doctor=request.user,
            lab=None,
            tests=[report_name],
            notes="",
            status=LabTestRequest.Status.COMPLETED,
            priority=LabTestRequest.Priority.ROUTINE,
            result_value=result_value,
            reference_range=reference_range,
            clinical_notes=(notes + f"\n[REPORT_NAME:{report_name}]").strip(),
            attachment=file,
        )
        try:
            summary = "NORMAL"
            notes_l = (obj.clinical_notes or "").lower()
            if "infection" in notes_l:
                summary = "INFECTION_DETECTED"
            elif (obj.result_value or "").strip().lower() not in ["", "normal"]:
                summary = "ABNORMAL"
            LabTestRecord.objects.create(
                request=obj,
                test_id=f"LAB-{obj.id:03d}",
                date=obj.created_at.date(),
                patient=obj.patient,
                doctor=obj.doctor,
                lab=obj.lab,
                test_type=", ".join(obj.tests) if isinstance(obj.tests, list) else str(obj.tests),
                result_summary=summary,
                result_details=obj.clinical_notes or "",
                attachment=obj.attachment,
            )
        except Exception:
            pass
        return Response(LabTestRequestSerializer(obj).data, status=201)


class LabHistoryListView(APIView):
    permission_classes = [IsLabOrAdmin]
    def get(self, request):
        q = request.GET.get("q", "").strip()
        statuses = request.GET.get("status")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        qs = LabTestRecord.objects.all().order_by("-date", "-created_at")
        if request.user.role == "LAB":
            qs = qs.filter(lab=request.user)
        if q:
            qs = qs.filter(
                Q(patient__username__icontains=q)
                | Q(test_type__icontains=q)
                | Q(test_id__icontains=q)
            )
        if statuses:
            arr = [s.strip().upper() for s in statuses.split(",") if s.strip()]
            qs = qs.filter(result_summary__in=arr)
        if start_date:
            try:
                sd = datetime.strptime(start_date, "%Y-%m-%d").date()
                qs = qs.filter(date__gte=sd)
            except Exception:
                pass
        if end_date:
            try:
                ed = datetime.strptime(end_date, "%Y-%m-%d").date()
                qs = qs.filter(date__lte=ed)
            except Exception:
                pass
        return Response(LabTestRecordSerializer(qs, many=True).data)


class LabRecordDetailView(APIView):
    permission_classes = [IsLabOrAdmin]
    def get(self, request, pk):
        if request.user.role == "LAB":
            obj = get_object_or_404(LabTestRecord, pk=pk, lab=request.user)
        else:
            obj = get_object_or_404(LabTestRecord, pk=pk)
        return Response(LabTestRecordSerializer(obj).data)


class LabHistoryExportCSVView(APIView):
    permission_classes = [IsLabOrAdmin]
    def get(self, request):
        q = request.GET.get("q", "").strip()
        statuses = request.GET.get("status")
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        qs = LabTestRecord.objects.all().order_by("-date", "-created_at")
        if request.user.role == "LAB":
            qs = qs.filter(lab=request.user)
        if q:
            qs = qs.filter(
                Q(patient__username__icontains=q)
                | Q(test_type__icontains=q)
                | Q(test_id__icontains=q)
            )
        if statuses:
            arr = [s.strip().upper() for s in statuses.split(",") if s.strip()]
            qs = qs.filter(result_summary__in=arr)
        if start_date:
            try:
                sd = datetime.strptime(start_date, "%Y-%m-%d").date()
                qs = qs.filter(date__gte=sd)
            except Exception:
                pass
        if end_date:
            try:
                ed = datetime.strptime(end_date, "%Y-%m-%d").date()
                qs = qs.filter(date__lte=ed)
            except Exception:
                pass
        def row_iter():
            buffer = StringIO()
            writer = csv.writer(buffer)
            writer.writerow(["Test ID", "Date", "Patient", "Test Type", "Doctor", "Result Summary"])
            yield buffer.getvalue()
            buffer.seek(0); buffer.truncate(0)
            for r in qs:
                writer.writerow([
                    r.test_id,
                    r.date.isoformat(),
                    getattr(r.patient, "username", ""),
                    r.test_type,
                    getattr(r.doctor, "username", "") if r.doctor else "",
                    r.get_result_summary_display(),
                ])
                yield buffer.getvalue()
                buffer.seek(0); buffer.truncate(0)
        resp = StreamingHttpResponse(row_iter(), content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="lab_history.csv"'
        return resp


class LabRecordPDFView(APIView):
    permission_classes = [IsLabOrAdmin]
    def get(self, request, pk):
        if request.user.role == "LAB":
            obj = get_object_or_404(LabTestRecord, pk=pk, lab=request.user)
        else:
            obj = get_object_or_404(LabTestRecord, pk=pk)
        if obj.attachment and str(obj.attachment).lower().endswith(".pdf"):
            return FileResponse(obj.attachment.open("rb"), as_attachment=True, filename=f"{obj.test_id}.pdf")
        try:
            from reportlab.pdfgen import canvas
            buffer = BytesIO()
            p = canvas.Canvas(buffer)
            p.setFont("Helvetica", 12)
            y = 800
            for line in [
                f"Test Record Details - {obj.test_id}",
                f"Date: {obj.date.isoformat()}",
                f"Patient: {getattr(obj.patient, 'username', '')}",
                f"Doctor: {getattr(obj.doctor, 'username', '') if obj.doctor else ''}",
                f"Lab: {getattr(obj.lab, 'username', '') if obj.lab else ''}",
                f"Test: {obj.test_type}",
                f"Result: {obj.get_result_summary_display()}",
                "",
                "Details:",
            ] + (obj.result_details or "").splitlines():
                p.drawString(50, y, line[:100])
                y -= 20
                if y < 50:
                    p.showPage()
                    y = 800
            p.showPage()
            p.save()
            buffer.seek(0)
            return FileResponse(buffer, as_attachment=True, filename=f"{obj.test_id}.pdf")
        except Exception:
            # Minimal PDF fallback
            content = f"Test Record Details - {obj.test_id}\\nDate: {obj.date.isoformat()}\\nPatient: {getattr(obj.patient, 'username', '')}\\nDoctor: {getattr(obj.doctor, 'username', '') if obj.doctor else ''}\\nLab: {getattr(obj.lab, 'username', '') if obj.lab else ''}\\nTest: {obj.test_type}\\nResult: {obj.get_result_summary_display()}\\n\\n{obj.result_details}"
            pdf_bytes = _simple_pdf_bytes(content)
            return HttpResponse(pdf_bytes, content_type="application/pdf")


def _simple_pdf_bytes(text):
    header = b"%PDF-1.4\\n"
    obj1 = b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\\n"
    obj2 = b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\\n"
    # Basic single-page content
    stream = f"BT /F1 12 Tf 50 750 Td ({text.replace('(', '[').replace(')', ']')}) Tj ET".encode("latin-1", "ignore")
    obj3 = f"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\\n".encode()
    obj4 = b"4 0 obj<</Length %d>>stream\\n" % len(stream) + stream + b"\\nendstream endobj\\n"
    obj5 = b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\\n"
    xref = b"xref\\n0 6\\n0000000000 65535 f \\n"
    parts = [header, obj1, obj2, obj3, obj4, obj5]
    offsets = []
    pos = len(header)
    for part in parts[1:]:
        offsets.append(pos)
        pos += len(part)
    xref += b"%010d 00000 n \\n" % 0
    for o in offsets:
        xref += b"%010d 00000 n \\n" % o
    trailer = b"trailer<</Size 6/Root 1 0 R>>\\nstartxref\\n" + str(pos).encode() + b"\\n%%EOF"
    return b"".join(parts + [xref, trailer])


class LabHistoryBackfillView(APIView):
    permission_classes = [IsLabOrAdmin]
    def post(self, request):
        qs = LabTestRequest.objects.filter(status=LabTestRequest.Status.COMPLETED)
        if request.user.role == "LAB":
            qs = qs.filter(lab=request.user)
        created = 0
        for req in qs:
            if hasattr(req, "record"):
                continue
            try:
                summary = "NORMAL"
                notes_l = (req.clinical_notes or "").lower()
                if "infection" in notes_l:
                    summary = "INFECTION_DETECTED"
                elif (req.result_value or "").strip().lower() not in ["", "normal"]:
                    summary = "ABNORMAL"
                LabTestRecord.objects.create(
                    request=req,
                    test_id=f"LAB-{req.id:03d}",
                    date=req.created_at.date(),
                    patient=req.patient,
                    doctor=req.doctor,
                    lab=req.lab,
                    test_type=", ".join(req.tests) if isinstance(req.tests, list) else str(req.tests),
                    result_summary=summary,
                    result_details=req.clinical_notes or "",
                    attachment=req.attachment,
                )
                created += 1
            except Exception:
                continue
        return Response({"created": created})
