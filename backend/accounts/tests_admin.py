from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from appointments.models import Appointment
from accounts.models import DoctorProfile, PatientProfile

User = get_user_model()

class AdminDetailTests(APITestCase):
    def setUp(self):
        # Create Admin
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='password123',
            role='ADMIN'
        )
        
        # Create Doctor
        self.doctor = User.objects.create_user(
            username='doctor',
            email='doctor@example.com',
            password='password123',
            role='DOCTOR'
        )
        DoctorProfile.objects.create(user=self.doctor, specialization='Cardiology')
        
        # Create Patient
        self.patient = User.objects.create_user(
            username='patient',
            email='patient@example.com',
            password='password123',
            role='PATIENT'
        )
        PatientProfile.objects.create(user=self.patient)
        
        # Create Appointment
        self.appointment = Appointment.objects.create(
            doctor=self.doctor,
            patient=self.patient,
            date='2024-02-10',
            time_slot='10:00',
            status='CONFIRMED',
            visit_type='Consultation'
        )

    def test_admin_get_doctor_detail(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin_doctor_detail', args=[self.doctor.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'doctor')
        self.assertEqual(response.data['specialization'], 'Cardiology')
        self.assertTrue('appointments' in response.data)
        self.assertEqual(len(response.data['appointments']), 1)
        self.assertEqual(response.data['appointments'][0]['patient_name'], 'patient')

    def test_admin_get_patient_detail(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('admin_patient_detail', args=[self.patient.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'patient')
        self.assertTrue('appointments' in response.data)
        self.assertEqual(len(response.data['appointments']), 1)

    def test_non_admin_access_denied(self):
        self.client.force_authenticate(user=self.doctor)
        url = reverse('admin_patient_detail', args=[self.patient.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
