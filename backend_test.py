#!/usr/bin/env python3
"""
Backend API Testing for Petsy App - Sponsorship and Conversations APIs
Testing the following endpoints:
1. Sponsorship API (HIGH PRIORITY)
2. Conversations/Messages API
"""

import requests
import json
import time
import random
import string
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://petsy-marketplace-1.preview.emergentagent.com/api"

class PetsyAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_id = None
        self.test_pet_id = None
        self.test_owner_id = None
        self.conversation_id = None
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
        
    def generate_test_email(self):
        """Generate unique test email"""
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        return f"testuser_{random_str}@petsy.com"
        
    def make_request(self, method, endpoint, data=None, headers=None, auth_required=True):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {"Content-Type": "application/json"}
            
        if auth_required and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            self.log_result(f"{method} {endpoint}", False, f"Request failed: {e}")
            return None
    
    def test_seed_data(self):
        """Test seed data endpoint"""
        print("🌱 Testing seed data creation...")
        response = self.make_request("POST", "/seed", auth_required=False)
        
        if response and response.status_code == 200:
            self.log_result("Seed Data", True, "Seed data created successfully")
            return True
        else:
            self.log_result("Seed Data", False, f"Seed data failed: {response.status_code if response else 'No response'}")
            return False
            
    def test_user_signup_and_verify(self):
        """Test user signup and verification"""
        print("👤 Testing user signup and verification...")
        
        # Generate test user data
        test_email = self.generate_test_email()
        user_data = {
            "email": test_email,
            "name": "Test User Sponsorship",
            "password": "testpass123",
            "phone": "+963987654321"
        }
        
        # Signup
        response = self.make_request("POST", "/auth/signup", user_data, auth_required=False)
        if not response or response.status_code != 200:
            self.log_result("User Signup", False, f"Signup failed: {response.status_code if response else 'No response'}")
            return False
            
        signup_data = response.json()
        self.user_id = signup_data.get("user_id")
        verification_code = signup_data.get("verification_code")
        
        self.log_result("User Signup", True, f"User signed up: {test_email}")
        
        # Verify account
        verify_response = self.make_request("POST", f"/auth/verify?user_id={self.user_id}&code={verification_code}", auth_required=False)
        if not verify_response or verify_response.status_code != 200:
            self.log_result("User Verification", False, f"Verification failed: {verify_response.status_code if verify_response else 'No response'}")
            return False
            
        verify_data = verify_response.json()
        self.auth_token = verify_data.get("access_token")
        
        self.log_result("User Verification", True, "User verified and authenticated")
        return True
        
    def test_get_pets(self):
        """Get pets for testing sponsorship"""
        print("🐕 Getting pets for testing...")
        
        response = self.make_request("GET", "/pets", auth_required=False)
        if not response or response.status_code != 200:
            self.log_result("Get Pets", False, f"Failed to get pets: {response.status_code if response else 'No response'}")
            return False
            
        pets = response.json()
        if not pets:
            self.log_result("Get Pets", False, "No pets found in database")
            return False
            
        # Use first pet for testing
        self.test_pet_id = pets[0]["id"]
        self.test_owner_id = pets[0]["owner_id"]
        
        self.log_result("Get Pets", True, f"Found test pet: {pets[0]['name']} (ID: {self.test_pet_id})")
        return True
        
    def test_sponsorship_api(self):
        """Test all sponsorship endpoints"""
        print("💰 Testing Sponsorship API...")
        
        if not self.test_pet_id:
            self.log_result("Sponsorship API", False, "No test pet available for sponsorship")
            return False
            
        # Test 1: Create sponsorship
        print("Testing POST /api/sponsorships...")
        sponsorship_data = {
            "pet_id": self.test_pet_id,
            "amount": 25.00,
            "message": "Good luck!",
            "is_anonymous": False
        }
        
        response = self.make_request("POST", "/sponsorships", sponsorship_data)
        if not response or response.status_code != 200:
            self.log_result("POST /api/sponsorships", False, f"Create sponsorship failed: {response.status_code if response else 'No response'}")
            if response:
                print(f"Response: {response.text}")
            return False
            
        sponsorship = response.json()
        self.log_result("POST /api/sponsorships", True, f"Sponsorship created: ${sponsorship['amount']} for pet {sponsorship['pet_id']}")
        
        # Test 2: Get user's sponsorships
        print("Testing GET /api/sponsorships/my...")
        response = self.make_request("GET", "/sponsorships/my")
        if not response or response.status_code != 200:
            self.log_result("GET /api/sponsorships/my", False, f"Get my sponsorships failed: {response.status_code if response else 'No response'}")
            return False
            
        my_sponsorships = response.json()
        self.log_result("GET /api/sponsorships/my", True, f"Retrieved {len(my_sponsorships)} user sponsorships")
        
        # Test 3: Get sponsorships for a pet
        print(f"Testing GET /api/sponsorships/pet/{self.test_pet_id}...")
        response = self.make_request("GET", f"/sponsorships/pet/{self.test_pet_id}", auth_required=False)
        if not response or response.status_code != 200:
            self.log_result("GET /api/sponsorships/pet/{pet_id}", False, f"Get pet sponsorships failed: {response.status_code if response else 'No response'}")
            return False
            
        pet_sponsorships = response.json()
        self.log_result("GET /api/sponsorships/pet/{pet_id}", True, f"Retrieved {len(pet_sponsorships)} sponsorships for pet")
        
        return True
        
    def test_conversations_api(self):
        """Test conversations and messages API"""
        print("💬 Testing Conversations/Messages API...")
        
        if not self.test_owner_id:
            self.log_result("Conversations API", False, "No test owner available for conversation")
            return False
            
        # Test 1: Create/get conversation
        print("Testing POST /api/conversations...")
        conversation_data = {
            "other_user_id": self.test_owner_id,
            "pet_id": self.test_pet_id,
            "initial_message": "Hi! I'm interested in this pet."
        }
        
        response = self.make_request("POST", "/conversations", conversation_data)
        if not response or response.status_code != 200:
            self.log_result("POST /api/conversations", False, f"Create conversation failed: {response.status_code if response else 'No response'}")
            if response:
                print(f"Response: {response.text}")
            return False
            
        conv_result = response.json()
        self.conversation_id = conv_result.get("conversation_id")
        self.log_result("POST /api/conversations", True, f"Conversation created/found: {self.conversation_id}")
        
        # Test 2: List user's conversations
        print("Testing GET /api/conversations...")
        response = self.make_request("GET", "/conversations")
        if not response or response.status_code != 200:
            self.log_result("GET /api/conversations", False, f"Get conversations failed: {response.status_code if response else 'No response'}")
            return False
            
        conversations = response.json()
        self.log_result("GET /api/conversations", True, f"Retrieved {len(conversations)} conversations")
        
        # Test 3: Get messages for conversation
        if self.conversation_id:
            print(f"Testing GET /api/conversations/{self.conversation_id}/messages...")
            response = self.make_request("GET", f"/conversations/{self.conversation_id}/messages")
            if not response or response.status_code != 200:
                self.log_result("GET /api/conversations/{id}/messages", False, f"Get messages failed: {response.status_code if response else 'No response'}")
                return False
                
            messages = response.json()
            self.log_result("GET /api/conversations/{id}/messages", True, f"Retrieved {len(messages)} messages")
            
            # Test 4: Send a message
            print(f"Testing POST /api/conversations/{self.conversation_id}/messages...")
            
            # Note: The endpoint expects content as a query parameter, not JSON body
            response = self.make_request("POST", f"/conversations/{self.conversation_id}/messages?content=Thank you for the information!")
            if not response or response.status_code != 200:
                self.log_result("POST /api/conversations/{id}/messages", False, f"Send message failed: {response.status_code if response else 'No response'}")
                if response:
                    print(f"Response: {response.text}")
                return False
                
            new_message = response.json()
            self.log_result("POST /api/conversations/{id}/messages", True, f"Message sent: {new_message.get('content', 'N/A')}")
        
        return True
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("PETSY BACKEND API TESTING - SPONSORSHIP & CONVERSATIONS")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        tests = [
            ("Seed Data", self.test_seed_data),
            ("User Signup & Verify", self.test_user_signup_and_verify),
            ("Get Pets", self.test_get_pets),
            ("Sponsorship API", self.test_sponsorship_api),
            ("Conversations API", self.test_conversations_api)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            print(f"\n{'='*50}")
            print(f"Running: {test_name}")
            print(f"{'='*50}")
            
            try:
                result = test_func()
                results[test_name] = result
                
                if result:
                    print(f"✅ {test_name} - PASSED")
                else:
                    print(f"❌ {test_name} - FAILED")
                    
            except Exception as e:
                print(f"❌ {test_name} - ERROR: {e}")
                results[test_name] = False
                
            time.sleep(1)  # Brief pause between tests
            
        # Summary
        print(f"\n{'='*60}")
        print("TEST SUMMARY")
        print(f"{'='*60}")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name}: {status}")
            
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed - check logs above")
            
        return results

if __name__ == "__main__":
    tester = PetsyAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    if all(results.values()):
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n💥 SOME TESTS FAILED!")
        sys.exit(1)