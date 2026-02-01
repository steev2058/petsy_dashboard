#!/usr/bin/env python3
"""
Petsy Backend API Testing Suite
Tests the Appointments and Vets APIs as requested
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import uuid

# Configuration
BACKEND_URL = "https://petsy-marketplace-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = "testuser@petsy.com"
TEST_USER_NAME = "Test User"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_PHONE = "+963912345678"

class PetsyAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        
        request_headers = {"Content-Type": "application/json"}
        if auth_required and self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"
        if headers:
            request_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_user_signup(self):
        """Test user signup"""
        data = {
            "email": TEST_USER_EMAIL,
            "name": TEST_USER_NAME,
            "password": TEST_USER_PASSWORD,
            "phone": TEST_USER_PHONE
        }
        
        response = self.make_request("POST", "/auth/signup", data, auth_required=False)
        
        if response is None:
            self.log_result("User Signup", False, "Request failed - connection error")
            return False
        
        if response.status_code == 201 or response.status_code == 200:
            try:
                result = response.json()
                self.user_id = result.get("user_id")
                verification_code = result.get("verification_code")
                self.log_result("User Signup", True, f"User created successfully with ID: {self.user_id}")
                return verification_code
            except:
                self.log_result("User Signup", False, "Invalid JSON response")
                return False
        elif response.status_code == 400:
            # User might already exist, try to continue with login
            self.log_result("User Signup", True, "User already exists (continuing with existing user)")
            return "existing_user"
        else:
            self.log_result("User Signup", False, f"Signup failed with status {response.status_code}: {response.text}")
            return False
    
    def test_user_verification(self, verification_code):
        """Test user verification"""
        if verification_code == "existing_user":
            return True
        
        if not self.user_id or not verification_code:
            self.log_result("User Verification", False, "Missing user_id or verification_code")
            return False
        
        response = self.make_request("POST", f"/auth/verify?user_id={self.user_id}&code={verification_code}", auth_required=False)
        
        if response is None:
            self.log_result("User Verification", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                result = response.json()
                self.auth_token = result.get("access_token")
                self.log_result("User Verification", True, "User verified and token received")
                return True
            except:
                self.log_result("User Verification", False, "Invalid JSON response")
                return False
        else:
            self.log_result("User Verification", False, f"Verification failed with status {response.status_code}: {response.text}")
            return False
    
    def test_user_login(self):
        """Test user login (fallback if verification fails)"""
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request("POST", "/auth/login", data, auth_required=False)
        
        if response is None:
            self.log_result("User Login", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                result = response.json()
                self.auth_token = result.get("access_token")
                user_data = result.get("user", {})
                self.user_id = user_data.get("id")
                self.log_result("User Login", True, f"Login successful, token received for user: {user_data.get('name')}")
                return True
            except:
                self.log_result("User Login", False, "Invalid JSON response")
                return False
        else:
            self.log_result("User Login", False, f"Login failed with status {response.status_code}: {response.text}")
            return False
    
    def test_get_vets(self):
        """Test GET /api/vets - Should return seeded vets"""
        response = self.make_request("GET", "/vets", auth_required=False)
        
        if response is None:
            self.log_result("GET /api/vets", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                vets = response.json()
                if isinstance(vets, list) and len(vets) > 0:
                    self.log_result("GET /api/vets", True, f"Retrieved {len(vets)} vets successfully")
                    # Log some vet details for verification
                    for i, vet in enumerate(vets[:2]):  # Show first 2 vets
                        print(f"   Vet {i+1}: {vet.get('name')} - {vet.get('clinic_name')} ({vet.get('city')})")
                    return vets
                else:
                    self.log_result("GET /api/vets", False, "No vets returned or invalid format")
                    return False
            except:
                self.log_result("GET /api/vets", False, "Invalid JSON response")
                return False
        else:
            self.log_result("GET /api/vets", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def test_get_vet_by_id(self, vet_id):
        """Test GET /api/vets/{id} - Get vet by ID"""
        response = self.make_request("GET", f"/vets/{vet_id}", auth_required=False)
        
        if response is None:
            self.log_result("GET /api/vets/{id}", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                vet = response.json()
                if vet.get("id") == vet_id:
                    self.log_result("GET /api/vets/{id}", True, f"Retrieved vet: {vet.get('name')} - {vet.get('clinic_name')}")
                    return vet
                else:
                    self.log_result("GET /api/vets/{id}", False, "Vet ID mismatch in response")
                    return False
            except:
                self.log_result("GET /api/vets/{id}", False, "Invalid JSON response")
                return False
        elif response.status_code == 404:
            self.log_result("GET /api/vets/{id}", False, "Vet not found")
            return False
        else:
            self.log_result("GET /api/vets/{id}", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def test_create_appointment(self, vet_id):
        """Test POST /api/appointments - Create a new appointment"""
        if not self.auth_token:
            self.log_result("POST /api/appointments", False, "No authentication token available")
            return False
        
        # Create appointment for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        data = {
            "vet_id": vet_id,
            "date": tomorrow,
            "time": "10:00 AM",
            "reason": "General Checkup",
            "notes": "Regular health checkup for my pet"
        }
        
        response = self.make_request("POST", "/appointments", data)
        
        if response is None:
            self.log_result("POST /api/appointments", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200 or response.status_code == 201:
            try:
                appointment = response.json()
                appointment_id = appointment.get("id")
                self.log_result("POST /api/appointments", True, f"Appointment created successfully with ID: {appointment_id}")
                print(f"   Appointment details: {appointment.get('date')} at {appointment.get('time')} - {appointment.get('reason')}")
                return appointment
            except:
                self.log_result("POST /api/appointments", False, "Invalid JSON response")
                return False
        else:
            self.log_result("POST /api/appointments", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def test_get_appointments(self):
        """Test GET /api/appointments - List user's appointments"""
        if not self.auth_token:
            self.log_result("GET /api/appointments", False, "No authentication token available")
            return False
        
        response = self.make_request("GET", "/appointments")
        
        if response is None:
            self.log_result("GET /api/appointments", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                appointments = response.json()
                if isinstance(appointments, list):
                    self.log_result("GET /api/appointments", True, f"Retrieved {len(appointments)} appointments")
                    for i, apt in enumerate(appointments[:3]):  # Show first 3 appointments
                        print(f"   Appointment {i+1}: {apt.get('date')} at {apt.get('time')} - {apt.get('reason')} (Status: {apt.get('status')})")
                    return appointments
                else:
                    self.log_result("GET /api/appointments", False, "Invalid response format")
                    return False
            except:
                self.log_result("GET /api/appointments", False, "Invalid JSON response")
                return False
        else:
            self.log_result("GET /api/appointments", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def test_get_appointment_by_id(self, appointment_id):
        """Test GET /api/appointments/{id} - Get single appointment"""
        if not self.auth_token:
            self.log_result("GET /api/appointments/{id}", False, "No authentication token available")
            return False
        
        response = self.make_request("GET", f"/appointments/{appointment_id}")
        
        if response is None:
            self.log_result("GET /api/appointments/{id}", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                appointment = response.json()
                if appointment.get("id") == appointment_id:
                    self.log_result("GET /api/appointments/{id}", True, f"Retrieved appointment: {appointment.get('date')} at {appointment.get('time')}")
                    return appointment
                else:
                    self.log_result("GET /api/appointments/{id}", False, "Appointment ID mismatch in response")
                    return False
            except:
                self.log_result("GET /api/appointments/{id}", False, "Invalid JSON response")
                return False
        elif response.status_code == 404:
            self.log_result("GET /api/appointments/{id}", False, "Appointment not found")
            return False
        else:
            self.log_result("GET /api/appointments/{id}", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def test_cancel_appointment(self, appointment_id):
        """Test PUT /api/appointments/{id}/cancel - Cancel an appointment"""
        if not self.auth_token:
            self.log_result("PUT /api/appointments/{id}/cancel", False, "No authentication token available")
            return False
        
        response = self.make_request("PUT", f"/appointments/{appointment_id}/cancel")
        
        if response is None:
            self.log_result("PUT /api/appointments/{id}/cancel", False, "Request failed - connection error")
            return False
        
        if response.status_code == 200:
            try:
                result = response.json()
                self.log_result("PUT /api/appointments/{id}/cancel", True, f"Appointment cancelled: {result.get('message')}")
                return True
            except:
                self.log_result("PUT /api/appointments/{id}/cancel", False, "Invalid JSON response")
                return False
        elif response.status_code == 404:
            self.log_result("PUT /api/appointments/{id}/cancel", False, "Appointment not found")
            return False
        else:
            self.log_result("PUT /api/appointments/{id}/cancel", False, f"Request failed with status {response.status_code}: {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("PETSY BACKEND API TESTING - APPOINTMENTS & VETS")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {TEST_USER_EMAIL}")
        print("=" * 60)
        
        # Step 1: User Authentication
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 30)
        
        verification_code = self.test_user_signup()
        if verification_code and verification_code != "existing_user":
            auth_success = self.test_user_verification(verification_code)
        else:
            auth_success = self.test_user_login()
        
        if not auth_success:
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with protected endpoints.")
            return False
        
        # Step 2: Vets API Tests
        print("\n🏥 VETS API TESTS")
        print("-" * 20)
        
        vets = self.test_get_vets()
        if vets and len(vets) > 0:
            # Test getting a specific vet
            first_vet = vets[0]
            vet_id = first_vet.get("id")
            if vet_id:
                self.test_get_vet_by_id(vet_id)
        
        # Step 3: Appointments API Tests
        print("\n📅 APPOINTMENTS API TESTS")
        print("-" * 25)
        
        # Create appointment (need a vet_id)
        if vets and len(vets) > 0:
            vet_id = vets[0].get("id")
            appointment = self.test_create_appointment(vet_id)
            
            # List appointments
            appointments = self.test_get_appointments()
            
            # Get specific appointment
            if appointment:
                appointment_id = appointment.get("id")
                if appointment_id:
                    self.test_get_appointment_by_id(appointment_id)
                    # Cancel appointment
                    self.test_cancel_appointment(appointment_id)
        else:
            print("❌ Cannot test appointments - no vets available")
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = PetsyAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        sys.exit(1)