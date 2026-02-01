#!/usr/bin/env python3
"""
Backend API Testing for Petsy Admin Dashboard
Tests admin access control and admin endpoints functionality
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://petadopt-8.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@petsy.com"
ADMIN_PASSWORD = "admin123"

# Test user credentials (for non-admin testing)
TEST_USER_EMAIL = "testuser@petsy.com"
TEST_USER_PASSWORD = "testpass123"

class AdminEndpointTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
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
    
    def setup_admin_auth(self):
        """Login with admin user and get token"""
        try:
            # First ensure seed data exists (admin user)
            seed_response = requests.post(f"{BACKEND_URL}/seed")
            print(f"Seed data response: {seed_response.status_code}")
            
            # Login as admin
            login_data = {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                user_info = data["user"]
                
                # Verify admin privileges
                if user_info.get("is_admin") and user_info.get("role") == "admin":
                    self.log_result("Admin Login", True, f"Successfully logged in as admin: {user_info['name']}")
                    return True
                else:
                    self.log_result("Admin Login", False, f"User logged in but lacks admin privileges: is_admin={user_info.get('is_admin')}, role={user_info.get('role')}")
                    return False
            else:
                self.log_result("Admin Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception during admin login: {str(e)}")
            return False
    
    def setup_regular_user_auth(self):
        """Create and login with regular user for non-admin testing"""
        try:
            # Create test user
            signup_data = {
                "email": TEST_USER_EMAIL,
                "name": "Test User",
                "password": TEST_USER_PASSWORD,
                "phone": "+963900000001"
            }
            
            signup_response = requests.post(f"{BACKEND_URL}/auth/signup", json=signup_data)
            
            if signup_response.status_code == 200:
                signup_result = signup_response.json()
                user_id = signup_result["user_id"]
                verification_code = signup_result["verification_code"]
                
                # Verify account
                verify_response = requests.post(f"{BACKEND_URL}/auth/verify", params={
                    "user_id": user_id,
                    "code": verification_code
                })
                
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    self.user_token = verify_data["access_token"]
                    self.log_result("Regular User Setup", True, "Created and verified test user")
                    return True
                else:
                    self.log_result("Regular User Setup", False, f"Verification failed: {verify_response.status_code}")
                    return False
            else:
                # User might already exist, try to login
                login_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                }
                
                login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                
                if login_response.status_code == 200:
                    login_result = login_response.json()
                    self.user_token = login_result["access_token"]
                    self.log_result("Regular User Setup", True, "Logged in with existing test user")
                    return True
                else:
                    self.log_result("Regular User Setup", False, f"Login failed: {login_response.status_code}")
                    return False
                    
        except Exception as e:
            self.log_result("Regular User Setup", False, f"Exception during user setup: {str(e)}")
            return False
    
    def test_admin_stats_endpoint(self):
        """Test GET /api/admin/stats endpoint"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify expected fields in stats
                expected_fields = ["users", "pets", "revenue", "monthlyStats"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("Admin Stats Endpoint", True, f"Stats returned successfully with all expected fields: {list(data.keys())}")
                    return True
                else:
                    self.log_result("Admin Stats Endpoint", False, f"Missing expected fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("Admin Stats Endpoint", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Stats Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_users_endpoint(self):
        """Test GET /api/admin/users endpoint"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) > 0:
                    # Check if users have is_admin field
                    first_user = data[0]
                    if "is_admin" in first_user:
                        admin_users = [u for u in data if u.get("is_admin")]
                        self.log_result("Admin Users Endpoint", True, f"Retrieved {len(data)} users, {len(admin_users)} admin users")
                        return True
                    else:
                        self.log_result("Admin Users Endpoint", False, "Users missing is_admin field", first_user)
                        return False
                else:
                    self.log_result("Admin Users Endpoint", False, "No users returned or invalid format", data)
                    return False
            else:
                self.log_result("Admin Users Endpoint", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Users Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_orders_endpoint(self):
        """Test GET /api/admin/orders endpoint"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/orders", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_result("Admin Orders Endpoint", True, f"Retrieved {len(data)} orders")
                    return True
                else:
                    self.log_result("Admin Orders Endpoint", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Admin Orders Endpoint", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Orders Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_products_endpoint(self):
        """Test GET /api/admin/products endpoint"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/products", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list):
                    self.log_result("Admin Products Endpoint", True, f"Retrieved {len(data)} products")
                    return True
                else:
                    self.log_result("Admin Products Endpoint", False, "Invalid response format", data)
                    return False
            else:
                self.log_result("Admin Products Endpoint", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Products Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_non_admin_access_control(self):
        """Test that non-admin users get 403 Forbidden on admin endpoints"""
        if not self.user_token:
            self.log_result("Non-Admin Access Control", False, "No regular user token available")
            return False
        
        admin_endpoints = [
            "/admin/stats",
            "/admin/users", 
            "/admin/orders",
            "/admin/products"
        ]
        
        headers = {"Authorization": f"Bearer {self.user_token}"}
        forbidden_count = 0
        
        for endpoint in admin_endpoints:
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)
                
                if response.status_code == 403:
                    forbidden_count += 1
                    print(f"   ✅ {endpoint}: Correctly returned 403 Forbidden")
                else:
                    print(f"   ❌ {endpoint}: Expected 403, got {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ {endpoint}: Exception - {str(e)}")
        
        if forbidden_count == len(admin_endpoints):
            self.log_result("Non-Admin Access Control", True, f"All {len(admin_endpoints)} admin endpoints correctly returned 403 for non-admin user")
            return True
        else:
            self.log_result("Non-Admin Access Control", False, f"Only {forbidden_count}/{len(admin_endpoints)} endpoints returned 403")
            return False
    
    def run_all_tests(self):
        """Run all admin endpoint tests"""
        print("🚀 Starting Admin Dashboard Backend Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Setup authentication
        if not self.setup_admin_auth():
            print("❌ Cannot proceed without admin authentication")
            return False
        
        if not self.setup_regular_user_auth():
            print("⚠️  Cannot test access control without regular user")
        
        # Run admin endpoint tests
        tests = [
            self.test_admin_stats_endpoint,
            self.test_admin_users_endpoint,
            self.test_admin_orders_endpoint,
            self.test_admin_products_endpoint,
            self.test_non_admin_access_control
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All admin endpoint tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} tests FAILED")
            return False
    
    def print_summary(self):
        """Print detailed test summary"""
        print("\n" + "=" * 60)
        print("📋 DETAILED TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status}: {result['test']}")
            print(f"   Message: {result['message']}")
            if result["details"] and not result["success"]:
                print(f"   Details: {result['details']}")
            print()

def main():
    """Main test execution"""
    tester = AdminEndpointTester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()