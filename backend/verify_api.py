import requests
import sys
import time

BASE_URL = "http://127.0.0.1:8000/api/auth"

def test_register_patient():
    print("\n--- Testing Patient Registration ---")
    data = {
        "username": "patient_test",
        "email": "patient_test@example.com",
        "password": "password123",
        "first_name": "John",
        "last_name": "Doe"
    }
    response = requests.post(f"{BASE_URL}/register/", json=data)
    if response.status_code == 201:
        print("✅ Patient Registration Successful")
        return True
    elif response.status_code == 400 and "username" in response.json():
        print("⚠️  Patient already exists (Skipping)")
        return True
    else:
        print(f"❌ Patient Registration Failed: {response.status_code} - {response.text}")
        return False

def test_login(username, password, role_name):
    print(f"\n--- Testing Login for {role_name} ---")
    data = {
        "username": username,
        "password": password
    }
    response = requests.post(f"{BASE_URL}/login/", json=data)
    if response.status_code == 200:
        print(f"✅ {role_name} Login Successful")
        return response.json()['access']
    else:
        print(f"❌ {role_name} Login Failed: {response.status_code} - {response.text}")
        return None

def test_admin_create_doctor(admin_token):
    print("\n--- Testing Admin creating Doctor ---")
    headers = {"Authorization": f"Bearer {admin_token}"}
    data = {
        "username": "doctor_test",
        "email": "doctor_test@example.com",
        "password": "password123",
        "role": "DOCTOR",
        "first_name": "Dr.",
        "last_name": "Smith"
    }
    response = requests.post(f"{BASE_URL}/create-staff/", json=data, headers=headers)
    if response.status_code == 201:
        print("✅ Doctor Creation Successful")
        return True
    elif response.status_code == 400 and "username" in response.json():
        print("⚠️  Doctor already exists (Skipping)")
        return True
    else:
        print(f"❌ Doctor Creation Failed: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("Starting API Verification...")
    print(f"Target: {BASE_URL}")
    
    try:
        # 1. Register Patient
        if test_register_patient():
            # 2. Login Patient
            test_login("patient_test", "password123", "Patient")
            
        # 3. Login Admin (created via CLI: admin1 / admin123)
        admin_token = test_login("admin1", "admin123", "Admin")
        
        if admin_token:
            # 4. Admin creates Doctor
            if test_admin_create_doctor(admin_token):
                # 5. Login Doctor
                test_login("doctor_test", "password123", "Doctor")
                
    except requests.exceptions.ConnectionError:
        print("\n❌ CRITICAL: Could not connect to server.")
        print("👉 Please make sure the Django server is running:")
        print("   cd backend")
        print("   venv\\Scripts\\python manage.py runserver")
