from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, AdminCreateStaffView, UserDetailView, UsersListView, AdminUserUpdateView, DoctorsPublicListView, LabsPublicListView, PharmaciesPublicListView, PatientProfileView, DoctorProfileView, PharmacyProfileView, LabProfileView, AdminProfileView, ChangePasswordView, ChangeUsernameView, AvatarUploadView, MyTokenObtainPairView, NotificationsListView, NotificationsUnreadCountView, NotificationsMarkReadView, NotificationsMarkAllReadView, SendCredentialsView, AdminBulkCreateUsersView, AdminTestEmailView, ForgotPasswordView
from .views_admin import (
    AdminDoctorDetailView,
    AdminPatientDetailView,
    AdminPharmacyDetailView,
    AdminLabDetailView,
    AdminPharmaciesListView,
    AdminPharmacyInventoryView,
    AdminPharmacyStatsView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('create-staff/', AdminCreateStaffView.as_view(), name='create_staff'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('users/', UsersListView.as_view(), name='users_list'),
    path('users/<int:pk>/', AdminUserUpdateView.as_view(), name='users_update'),
    path('doctors/', DoctorsPublicListView.as_view(), name='doctors_public_list'),
    path('labs/', LabsPublicListView.as_view(), name='labs_public_list'),
    path('pharmacies/', PharmaciesPublicListView.as_view(), name='pharmacies_public_list'),
    path('patient/profile/', PatientProfileView.as_view(), name='patient_profile'),
    path('doctor/profile/', DoctorProfileView.as_view(), name='doctor_profile'),
    path('pharmacy/profile/', PharmacyProfileView.as_view(), name='pharmacy_profile'),
    path('labs/profile/', LabProfileView.as_view(), name='lab_profile'),
    path('admin/profile/', AdminProfileView.as_view(), name='admin_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('change-username/', ChangeUsernameView.as_view(), name='change_username'),
    path('profile/avatar/', AvatarUploadView.as_view(), name='profile_avatar'),
    path('notifications/', NotificationsListView.as_view(), name='notifications_list'),
    path('notifications/unread-count/', NotificationsUnreadCountView.as_view(), name='notifications_unread_count'),
    path('notifications/<int:pk>/read/', NotificationsMarkReadView.as_view(), name='notifications_mark_read'),
    path('notifications/mark-all-read/', NotificationsMarkAllReadView.as_view(), name='notifications_mark_all_read'),
    
    # Admin Detail Views
    path('admin/doctors/<int:id>/', AdminDoctorDetailView.as_view(), name='admin_doctor_detail'),
    path('admin/patients/<int:id>/', AdminPatientDetailView.as_view(), name='admin_patient_detail'),
    path('admin/pharmacies/', AdminPharmaciesListView.as_view(), name='admin_pharmacies_list'),
    path('admin/pharmacies/<int:id>/', AdminPharmacyDetailView.as_view(), name='admin_pharmacy_detail'),
    path('admin/pharmacies/<int:id>/inventory/', AdminPharmacyInventoryView.as_view(), name='admin_pharmacy_inventory'),
    path('admin/pharmacies/<int:id>/stats/', AdminPharmacyStatsView.as_view(), name='admin_pharmacy_stats'),
    path('admin/labs/<int:id>/', AdminLabDetailView.as_view(), name='admin_lab_detail'),
    path('admin/send-credentials/', SendCredentialsView.as_view(), name='admin_send_credentials'),
    path('admin/bulk-create/', AdminBulkCreateUsersView.as_view(), name='admin_bulk_create_users'),
    path('admin/test-email/', AdminTestEmailView.as_view(), name='admin_test_email'),
]
