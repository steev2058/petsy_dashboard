#!/usr/bin/env python3
"""
Petsy Backend API Testing Suite
Tests all backend endpoints according to test_result.md requirements
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from frontend/.env
BACKEND_URL = "https://petsy-adoption.preview.emergentagent.com/api"

class PetsyAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.access_token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_data': response_data
        })
        
    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None

    def test_health_check(self):
        """Test basic health endpoint"""
        print("\n=== Testing Health Check ===")
        response = self.make_request('GET', '/health')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'status' in data and data['status'] == 'healthy':
                self.log_result("Health Check", True, "API is healthy")
                return True
            else:
                self.log_result("Health Check", False, f"Unexpected response: {data}")
        else:
            status_code = response.status_code if response else "No response"
            self.log_result("Health Check", False, f"Health check failed with status: {status_code}")
        return False

    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("\n=== Testing Authentication Flow ===")
        
        # Generate unique test user data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"testuser_{timestamp}@petsy.com"
        test_name = f"Test User {timestamp}"
        test_password = "SecurePass123!"
        test_phone = "+963987654321"
        
        # 1. Test Signup
        signup_data = {
            "email": test_email,
            "name": test_name,
            "password": test_password,
            "phone": test_phone
        }
        
        response = self.make_request('POST', '/auth/signup', signup_data)
        if not response or response.status_code != 200:
            error_msg = f"Signup failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Signup", False, error_msg)
            return False
            
        signup_result = response.json()
        if 'user_id' not in signup_result or 'verification_code' not in signup_result:
            self.log_result("Auth Signup", False, f"Missing user_id or verification_code in response: {signup_result}")
            return False
            
        self.user_id = signup_result['user_id']
        verification_code = signup_result['verification_code']
        self.log_result("Auth Signup", True, f"User created with ID: {self.user_id}")
        
        # 2. Test Verification
        response = self.make_request('POST', f'/auth/verify?user_id={self.user_id}&code={verification_code}')
        if not response or response.status_code != 200:
            error_msg = f"Verification failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Verify", False, error_msg)
            return False
            
        verify_result = response.json()
        if 'access_token' not in verify_result:
            self.log_result("Auth Verify", False, f"Missing access_token in response: {verify_result}")
            return False
            
        self.access_token = verify_result['access_token']
        self.log_result("Auth Verify", True, "Account verified and token received")
        
        # 3. Test Login
        login_data = {
            "email": test_email,
            "password": test_password
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        if not response or response.status_code != 200:
            error_msg = f"Login failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Login", False, error_msg)
            return False
            
        login_result = response.json()
        if 'access_token' not in login_result:
            self.log_result("Auth Login", False, f"Missing access_token in login response: {login_result}")
            return False
            
        self.access_token = login_result['access_token']
        self.log_result("Auth Login", True, "Login successful")
        
        # 4. Test Get Profile
        response = self.make_request('GET', '/auth/me', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get profile failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Get Profile", False, error_msg)
            return False
            
        profile_result = response.json()
        if profile_result.get('email') != test_email:
            self.log_result("Auth Get Profile", False, f"Profile email mismatch: {profile_result}")
            return False
            
        self.log_result("Auth Get Profile", True, f"Profile retrieved for {profile_result.get('name')}")
        
        # 5. Test Update Profile
        update_data = {
            "city": "Damascus",
            "bio": "Pet lover and tester"
        }
        
        response = self.make_request('PUT', '/auth/update', update_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Update profile failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Update Profile", False, error_msg)
            return False
            
        update_result = response.json()
        if update_result.get('city') != 'Damascus':
            self.log_result("Auth Update Profile", False, f"Profile update failed: {update_result}")
            return False
            
        self.log_result("Auth Update Profile", True, "Profile updated successfully")
        return True

    def test_pet_management(self):
        """Test pet CRUD operations"""
        print("\n=== Testing Pet Management ===")
        
        if not self.access_token:
            self.log_result("Pet Management", False, "No access token available")
            return False
            
        # 1. Create Pet
        pet_data = {
            "name": "Buddy",
            "species": "dog",
            "breed": "Golden Retriever",
            "age": "2 years",
            "gender": "male",
            "color": "golden",
            "weight": 25.5,
            "description": "Friendly and energetic dog looking for a loving home",
            "status": "for_adoption",
            "location": "Damascus",
            "vaccinated": True,
            "neutered": False
        }
        
        response = self.make_request('POST', '/pets', pet_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Create pet failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Pet Create", False, error_msg)
            return False
            
        created_pet = response.json()
        pet_id = created_pet.get('id')
        if not pet_id:
            self.log_result("Pet Create", False, f"Missing pet ID in response: {created_pet}")
            return False
            
        self.log_result("Pet Create", True, f"Pet created with ID: {pet_id}")
        
        # 2. Get All Pets
        response = self.make_request('GET', '/pets')
        if not response or response.status_code != 200:
            error_msg = f"Get pets failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet List All", False, error_msg)
        else:
            pets = response.json()
            if isinstance(pets, list) and len(pets) > 0:
                self.log_result("Pet List All", True, f"Retrieved {len(pets)} pets")
            else:
                self.log_result("Pet List All", False, f"Unexpected pets response: {pets}")
        
        # 3. Get Pets with Filters
        response = self.make_request('GET', '/pets?status=for_adoption&species=dog')
        if response and response.status_code == 200:
            filtered_pets = response.json()
            self.log_result("Pet List Filtered", True, f"Retrieved {len(filtered_pets)} filtered pets")
        else:
            self.log_result("Pet List Filtered", False, f"Filter pets failed with status {response.status_code if response else 'No response'}")
        
        # 4. Get My Pets
        response = self.make_request('GET', '/pets/my', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get my pets failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet List My", False, error_msg)
        else:
            my_pets = response.json()
            if isinstance(my_pets, list):
                self.log_result("Pet List My", True, f"Retrieved {len(my_pets)} user pets")
            else:
                self.log_result("Pet List My", False, f"Unexpected my pets response: {my_pets}")
        
        # 5. Get Single Pet
        response = self.make_request('GET', f'/pets/{pet_id}')
        if not response or response.status_code != 200:
            error_msg = f"Get single pet failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet Get Single", False, error_msg)
        else:
            single_pet = response.json()
            if single_pet.get('id') == pet_id:
                self.log_result("Pet Get Single", True, f"Retrieved pet: {single_pet.get('name')}")
            else:
                self.log_result("Pet Get Single", False, f"Pet ID mismatch: {single_pet}")
        
        # 6. Update Pet
        update_data = {
            "description": "Updated: Very friendly dog, great with kids",
            "price": 100.0
        }
        
        response = self.make_request('PUT', f'/pets/{pet_id}', update_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Update pet failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet Update", False, error_msg)
        else:
            updated_pet = response.json()
            if "Updated:" in updated_pet.get('description', ''):
                self.log_result("Pet Update", True, "Pet updated successfully")
            else:
                self.log_result("Pet Update", False, f"Pet update verification failed: {updated_pet}")
        
        # 7. Like Pet
        response = self.make_request('POST', f'/pets/{pet_id}/like', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Like pet failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet Like", False, error_msg)
        else:
            like_result = response.json()
            if 'liked' in like_result:
                self.log_result("Pet Like", True, f"Pet like toggled: {like_result['liked']}")
            else:
                self.log_result("Pet Like", False, f"Unexpected like response: {like_result}")
        
        # 8. Delete Pet
        response = self.make_request('DELETE', f'/pets/{pet_id}', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Delete pet failed with status {response.status_code if response else 'No response'}"
            self.log_result("Pet Delete", False, error_msg)
        else:
            delete_result = response.json()
            if 'message' in delete_result:
                self.log_result("Pet Delete", True, "Pet deleted successfully")
            else:
                self.log_result("Pet Delete", False, f"Unexpected delete response: {delete_result}")
        
        return True

    def test_other_apis(self):
        """Test vets, products, and emergency contacts APIs"""
        print("\n=== Testing Other APIs ===")
        
        # 1. Test Vets API
        response = self.make_request('GET', '/vets')
        if not response or response.status_code != 200:
            error_msg = f"Get vets failed with status {response.status_code if response else 'No response'}"
            self.log_result("Vets API", False, error_msg)
        else:
            vets = response.json()
            if isinstance(vets, list):
                self.log_result("Vets API", True, f"Retrieved {len(vets)} vets")
            else:
                self.log_result("Vets API", False, f"Unexpected vets response: {vets}")
        
        # 2. Test Products API
        response = self.make_request('GET', '/products')
        if not response or response.status_code != 200:
            error_msg = f"Get products failed with status {response.status_code if response else 'No response'}"
            self.log_result("Products API", False, error_msg)
        else:
            products = response.json()
            if isinstance(products, list):
                self.log_result("Products API", True, f"Retrieved {len(products)} products")
            else:
                self.log_result("Products API", False, f"Unexpected products response: {products}")
        
        # 3. Test Emergency Contacts API
        response = self.make_request('GET', '/emergency-contacts')
        if not response or response.status_code != 200:
            error_msg = f"Get emergency contacts failed with status {response.status_code if response else 'No response'}"
            self.log_result("Emergency Contacts API", False, error_msg)
        else:
            contacts = response.json()
            if isinstance(contacts, list):
                self.log_result("Emergency Contacts API", True, f"Retrieved {len(contacts)} emergency contacts")
            else:
                self.log_result("Emergency Contacts API", False, f"Unexpected contacts response: {contacts}")

    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting Petsy Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity first
        if not self.test_health_check():
            print("\n❌ Health check failed - stopping tests")
            return False
        
        # Test authentication flow
        auth_success = self.test_authentication_flow()
        
        # Test pet management (requires auth)
        if auth_success:
            self.test_pet_management()
        else:
            print("\n⚠️  Skipping pet management tests due to auth failure")
        
        # Test other APIs (no auth required)
        self.test_other_apis()
        
        # Print summary
        self.print_summary()
        
        return True

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    tester = PetsyAPITester()
    tester.run_all_tests()