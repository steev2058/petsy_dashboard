#!/usr/bin/env python3
"""
Backend API Testing for Petsy Payment and Loyalty Points APIs
Testing Payment Config, Loyalty Points, and Payment Processing endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://petsy-marketplace-1.preview.emergentagent.com/api"

class PetsyPaymentAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_data"] = response_data
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def setup_test_user(self):
        """Create and authenticate a test user"""
        print("🔧 Setting up test user...")
        
        # First, seed data
        try:
            response = requests.post(f"{self.base_url}/seed")
            if response.status_code == 200:
                print("✅ Seed data created successfully")
            else:
                print(f"⚠️  Seed data response: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Seed data error: {e}")
        
        # Create test user
        test_email = f"payment_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@petsy.com"
        signup_data = {
            "email": test_email,
            "name": "Payment Test User",
            "password": "testpass123",
            "phone": "+963987654321"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=signup_data)
            if response.status_code == 200:
                signup_result = response.json()
                self.user_id = signup_result["user_id"]
                verification_code = signup_result["verification_code"]
                print(f"✅ User created: {test_email}")
                
                # Verify user
                verify_response = requests.post(
                    f"{self.base_url}/auth/verify",
                    params={"user_id": self.user_id, "code": verification_code}
                )
                
                if verify_response.status_code == 200:
                    verify_result = verify_response.json()
                    self.auth_token = verify_result["access_token"]
                    print(f"✅ User verified and authenticated")
                    return True
                else:
                    print(f"❌ Verification failed: {verify_response.status_code} - {verify_response.text}")
                    return False
            else:
                print(f"❌ Signup failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Setup error: {e}")
            return False

    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}

    def test_payment_config(self):
        """Test GET /api/payments/config - Should return payment configuration"""
        try:
            response = requests.get(f"{self.base_url}/payments/config")
            
            if response.status_code == 200:
                config = response.json()
                
                # Validate required fields
                required_fields = ["stripe_publishable_key", "supported_methods", "currency"]
                missing_fields = [field for field in required_fields if field not in config]
                
                if missing_fields:
                    self.log_test(
                        "Payment Config API",
                        False,
                        f"Missing required fields: {missing_fields}",
                        config
                    )
                else:
                    # Check if supported methods include expected payment types
                    expected_methods = ["stripe", "cash_on_delivery"]
                    has_expected = any(method in config["supported_methods"] for method in expected_methods)
                    
                    if has_expected:
                        self.log_test(
                            "Payment Config API",
                            True,
                            f"Config returned with {len(config['supported_methods'])} payment methods: {config['supported_methods']}",
                            config
                        )
                    else:
                        self.log_test(
                            "Payment Config API",
                            False,
                            f"No expected payment methods found in: {config['supported_methods']}",
                            config
                        )
            else:
                self.log_test(
                    "Payment Config API",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Payment Config API", False, f"Exception: {str(e)}")

    def test_loyalty_points(self):
        """Test GET /api/loyalty/points - Get user's points balance (requires auth)"""
        if not self.auth_token:
            self.log_test("Loyalty Points API", False, "No auth token available")
            return
            
        try:
            response = requests.get(
                f"{self.base_url}/loyalty/points",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                points_data = response.json()
                
                # Validate required fields
                required_fields = ["total_points", "lifetime_points", "tier", "points_value"]
                missing_fields = [field for field in required_fields if field not in points_data]
                
                if missing_fields:
                    self.log_test(
                        "Loyalty Points API",
                        False,
                        f"Missing required fields: {missing_fields}",
                        points_data
                    )
                else:
                    self.log_test(
                        "Loyalty Points API",
                        True,
                        f"Points: {points_data['total_points']}, Tier: {points_data['tier']}, Value: ${points_data['points_value']:.2f}",
                        points_data
                    )
            elif response.status_code == 401:
                self.log_test(
                    "Loyalty Points API",
                    False,
                    "Authentication failed - check auth token"
                )
            else:
                self.log_test(
                    "Loyalty Points API",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Loyalty Points API", False, f"Exception: {str(e)}")

    def test_loyalty_transactions(self):
        """Test GET /api/loyalty/transactions - Get points history (requires auth)"""
        if not self.auth_token:
            self.log_test("Loyalty Transactions API", False, "No auth token available")
            return
            
        try:
            response = requests.get(
                f"{self.base_url}/loyalty/transactions",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                transactions = response.json()
                
                if isinstance(transactions, list):
                    self.log_test(
                        "Loyalty Transactions API",
                        True,
                        f"Retrieved {len(transactions)} transactions",
                        {"transaction_count": len(transactions), "sample": transactions[:2] if transactions else []}
                    )
                else:
                    self.log_test(
                        "Loyalty Transactions API",
                        False,
                        "Response is not a list",
                        transactions
                    )
            elif response.status_code == 401:
                self.log_test(
                    "Loyalty Transactions API",
                    False,
                    "Authentication failed - check auth token"
                )
            else:
                self.log_test(
                    "Loyalty Transactions API",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Loyalty Transactions API", False, f"Exception: {str(e)}")

    def test_payment_processing(self):
        """Test POST /api/payments/process - Process a payment (requires auth)"""
        if not self.auth_token:
            self.log_test("Payment Processing API", False, "No auth token available")
            return
            
        # Test data from review request
        payment_data = {
            "amount": 25.00,
            "payment_method": "stripe",
            "points_to_use": 0
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/payments/process",
                json=payment_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                payment_result = response.json()
                
                # Validate required fields in response
                required_fields = ["success", "payment_id", "amount", "method"]
                missing_fields = [field for field in required_fields if field not in payment_result]
                
                if missing_fields:
                    self.log_test(
                        "Payment Processing API",
                        False,
                        f"Missing required fields in response: {missing_fields}",
                        payment_result
                    )
                elif payment_result.get("success"):
                    self.log_test(
                        "Payment Processing API",
                        True,
                        f"Payment processed: ID={payment_result['payment_id']}, Amount=${payment_result['amount']}, Method={payment_result['method']}",
                        payment_result
                    )
                else:
                    self.log_test(
                        "Payment Processing API",
                        False,
                        "Payment marked as unsuccessful",
                        payment_result
                    )
            elif response.status_code == 401:
                self.log_test(
                    "Payment Processing API",
                    False,
                    "Authentication failed - check auth token"
                )
            else:
                self.log_test(
                    "Payment Processing API",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Payment Processing API", False, f"Exception: {str(e)}")

    def test_payment_processing_with_points(self):
        """Test payment processing with points redemption"""
        if not self.auth_token:
            self.log_test("Payment Processing with Points", False, "No auth token available")
            return
            
        # First, give user some points for testing
        try:
            bonus_response = requests.post(
                f"{self.base_url}/loyalty/bonus",
                params={"points": 500, "description": "Test bonus points"},
                headers=self.get_auth_headers()
            )
            
            if bonus_response.status_code == 200:
                print("✅ Added 500 bonus points for testing")
            else:
                print(f"⚠️  Could not add bonus points: {bonus_response.status_code}")
        except Exception as e:
            print(f"⚠️  Bonus points error: {e}")
        
        # Test payment with points
        payment_data = {
            "amount": 25.00,
            "payment_method": "stripe",
            "points_to_use": 200  # $2 discount
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/payments/process",
                json=payment_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                payment_result = response.json()
                
                if payment_result.get("success"):
                    expected_final_amount = 25.00 - 2.00  # $25 - $2 points discount
                    actual_amount = payment_result.get("amount", 0)
                    
                    if abs(actual_amount - expected_final_amount) < 0.01:  # Allow for floating point precision
                        self.log_test(
                            "Payment Processing with Points",
                            True,
                            f"Points discount applied correctly: ${payment_result.get('original_amount', 0)} - ${payment_result.get('points_discount', 0)} = ${actual_amount}",
                            payment_result
                        )
                    else:
                        self.log_test(
                            "Payment Processing with Points",
                            False,
                            f"Points discount calculation error: expected ${expected_final_amount}, got ${actual_amount}",
                            payment_result
                        )
                else:
                    self.log_test(
                        "Payment Processing with Points",
                        False,
                        "Payment marked as unsuccessful",
                        payment_result
                    )
            else:
                self.log_test(
                    "Payment Processing with Points",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_test("Payment Processing with Points", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all payment and loyalty API tests"""
        print("🚀 Starting Payment and Loyalty Points API Testing")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return False
        
        print("\n📋 Running API Tests...")
        print("-" * 40)
        
        # Test Payment Config (no auth required)
        self.test_payment_config()
        
        # Test Loyalty Points APIs (auth required)
        self.test_loyalty_points()
        self.test_loyalty_transactions()
        
        # Test Payment Processing APIs (auth required)
        self.test_payment_processing()
        self.test_payment_processing_with_points()
        
        # Summary
        print("\n📊 Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = PetsyPaymentAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)