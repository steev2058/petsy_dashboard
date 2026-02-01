#!/usr/bin/env python3
"""
Petsy Backend API Testing Suite - Phase 2 APIs
Tests Phase 2 backend endpoints: Map Locations, Orders, Appointments, Conversations/Messages, Cart
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os
import time

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

    def test_seed_data(self):
        """Test seed data endpoint first"""
        print("\n=== Testing Seed Data ===")
        response = self.make_request('POST', '/seed')
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_result("Seed Data", True, "Seed data created successfully")
            return True
        else:
            error_msg = f"Seed failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Seed Data", False, error_msg)
            return False

    def setup_authentication(self):
        """Setup authentication for testing authenticated endpoints"""
        print("\n=== Setting Up Authentication ===")
        
        # Generate unique test user data
        timestamp = int(time.time())
        test_email = f"testuser_{timestamp}@petsy.com"
        test_name = f"Test User {timestamp}"
        test_password = "SecurePass123!"
        test_phone = "+963987654321"
        
        # 1. Signup
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
            self.log_result("Auth Setup - Signup", False, error_msg)
            return False
            
        signup_result = response.json()
        if 'user_id' not in signup_result or 'verification_code' not in signup_result:
            self.log_result("Auth Setup - Signup", False, f"Missing user_id or verification_code: {signup_result}")
            return False
            
        self.user_id = signup_result['user_id']
        verification_code = signup_result['verification_code']
        self.log_result("Auth Setup - Signup", True, f"User created with ID: {self.user_id}")
        
        # 2. Verify
        response = self.make_request('POST', f'/auth/verify?user_id={self.user_id}&code={verification_code}')
        if not response or response.status_code != 200:
            error_msg = f"Verification failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Auth Setup - Verify", False, error_msg)
            return False
            
        verify_result = response.json()
        if 'access_token' not in verify_result:
            self.log_result("Auth Setup - Verify", False, f"Missing access_token: {verify_result}")
            return False
            
        self.access_token = verify_result['access_token']
        self.log_result("Auth Setup - Verify", True, "Account verified and token received")
        return True

    def test_map_locations_api(self):
        """Test Map Locations API (High Priority)"""
        print("\n=== Testing Map Locations API ===")
        
        # Test 1: Get all map locations
        response = self.make_request('GET', '/map-locations')
        if not response or response.status_code != 200:
            error_msg = f"Get map locations failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Map Locations - Get All", False, error_msg)
            return False
        else:
            locations = response.json()
            if isinstance(locations, list) and len(locations) > 0:
                self.log_result("Map Locations - Get All", True, f"Retrieved {len(locations)} locations")
            else:
                self.log_result("Map Locations - Get All", False, f"No locations returned: {locations}")
                return False
        
        # Test 2: Filter by type (vet)
        response = self.make_request('GET', '/map-locations?type=vet')
        if response and response.status_code == 200:
            vet_locations = response.json()
            if isinstance(vet_locations, list):
                vet_count = len([loc for loc in vet_locations if loc.get('type') == 'vet'])
                self.log_result("Map Locations - Filter by Vet", True, f"Retrieved {vet_count} vet locations")
            else:
                self.log_result("Map Locations - Filter by Vet", False, f"Invalid response format: {vet_locations}")
        else:
            error_msg = f"Filter by vet failed with status {response.status_code if response else 'No response'}"
            self.log_result("Map Locations - Filter by Vet", False, error_msg)
        
        # Test 3: Filter by city
        response = self.make_request('GET', '/map-locations?city=Damascus')
        if response and response.status_code == 200:
            damascus_locations = response.json()
            if isinstance(damascus_locations, list):
                self.log_result("Map Locations - Filter by City", True, f"Retrieved {len(damascus_locations)} Damascus locations")
            else:
                self.log_result("Map Locations - Filter by City", False, f"Invalid response format: {damascus_locations}")
        else:
            error_msg = f"Filter by city failed with status {response.status_code if response else 'No response'}"
            self.log_result("Map Locations - Filter by City", False, error_msg)
        
        return True

    def test_orders_api(self):
        """Test Orders API (High Priority, requires authentication)"""
        print("\n=== Testing Orders API ===")
        
        if not self.access_token:
            self.log_result("Orders API", False, "No authentication token available")
            return False
            
        # Test 1: Create an order
        order_data = {
            "items": [
                {
                    "product_id": str(uuid.uuid4()),
                    "name": "Premium Dog Food",
                    "price": 25.99,
                    "quantity": 2,
                    "image": "dog_food.jpg"
                },
                {
                    "product_id": str(uuid.uuid4()),
                    "name": "Cat Scratching Post",
                    "price": 29.99,
                    "quantity": 1,
                    "image": "cat_post.jpg"
                }
            ],
            "total": 81.97,
            "shipping_address": "123 Pet Lover Street, Mezzeh",
            "shipping_city": "Damascus",
            "shipping_phone": "+963912345678",
            "payment_method": "cash_on_delivery",
            "notes": "Please call before delivery"
        }
        
        response = self.make_request('POST', '/orders', order_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Create order failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Orders - Create Order", False, error_msg)
            return False
            
        order_result = response.json()
        order_id = order_result.get("id")
        if not order_id:
            self.log_result("Orders - Create Order", False, f"Missing order ID: {order_result}")
            return False
            
        self.log_result("Orders - Create Order", True, f"Order created with ID: {order_id}")
        
        # Test 2: Get user's orders
        response = self.make_request('GET', '/orders', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get orders failed with status {response.status_code if response else 'No response'}"
            self.log_result("Orders - Get User Orders", False, error_msg)
        else:
            orders = response.json()
            if isinstance(orders, list) and len(orders) > 0:
                self.log_result("Orders - Get User Orders", True, f"Retrieved {len(orders)} orders")
            else:
                self.log_result("Orders - Get User Orders", False, f"No orders returned: {orders}")
                
        # Test 3: Get specific order
        response = self.make_request('GET', f'/orders/{order_id}', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get specific order failed with status {response.status_code if response else 'No response'}"
            self.log_result("Orders - Get Specific Order", False, error_msg)
        else:
            order_details = response.json()
            if order_details.get('id') == order_id:
                self.log_result("Orders - Get Specific Order", True, f"Retrieved order details for {order_id}")
            else:
                self.log_result("Orders - Get Specific Order", False, f"Order ID mismatch: {order_details}")
        
        return True

    def test_appointments_api(self):
        """Test Appointments API (Medium Priority, requires authentication)"""
        print("\n=== Testing Appointments API ===")
        
        if not self.access_token:
            self.log_result("Appointments API", False, "No authentication token available")
            return False
            
        # First get a vet ID from seeded data
        vet_response = self.make_request('GET', '/vets')
        vet_id = None
        if vet_response and vet_response.status_code == 200:
            vets = vet_response.json()
            if vets and len(vets) > 0:
                vet_id = vets[0].get("id")
                
        if not vet_id:
            self.log_result("Appointments - Setup", False, "No vets available for appointment testing")
            return False
            
        # Test 1: Create an appointment
        appointment_data = {
            "vet_id": vet_id,
            "date": "2025-02-20",
            "time": "2:00 PM",
            "reason": "Annual checkup for my golden retriever",
            "notes": "Dog is very friendly but gets nervous at vet visits"
        }
        
        response = self.make_request('POST', '/appointments', appointment_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Create appointment failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Appointments - Create", False, error_msg)
            return False
            
        appointment_result = response.json()
        appointment_id = appointment_result.get("id")
        if not appointment_id:
            self.log_result("Appointments - Create", False, f"Missing appointment ID: {appointment_result}")
            return False
            
        self.log_result("Appointments - Create", True, f"Appointment created with ID: {appointment_id}")
        
        # Test 2: Get user's appointments
        response = self.make_request('GET', '/appointments', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get appointments failed with status {response.status_code if response else 'No response'}"
            self.log_result("Appointments - Get User Appointments", False, error_msg)
        else:
            appointments = response.json()
            if isinstance(appointments, list) and len(appointments) > 0:
                self.log_result("Appointments - Get User Appointments", True, f"Retrieved {len(appointments)} appointments")
            else:
                self.log_result("Appointments - Get User Appointments", False, f"No appointments returned: {appointments}")
                
        # Test 3: Get specific appointment
        response = self.make_request('GET', f'/appointments/{appointment_id}', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get specific appointment failed with status {response.status_code if response else 'No response'}"
            self.log_result("Appointments - Get Specific", False, error_msg)
        else:
            appointment_details = response.json()
            if appointment_details.get('id') == appointment_id:
                self.log_result("Appointments - Get Specific", True, f"Retrieved appointment details for {appointment_id}")
            else:
                self.log_result("Appointments - Get Specific", False, f"Appointment ID mismatch: {appointment_details}")
                
        # Test 4: Cancel appointment
        response = self.make_request('PUT', f'/appointments/{appointment_id}/cancel', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Cancel appointment failed with status {response.status_code if response else 'No response'}"
            self.log_result("Appointments - Cancel", False, error_msg)
        else:
            cancel_result = response.json()
            if 'message' in cancel_result:
                self.log_result("Appointments - Cancel", True, f"Appointment {appointment_id} cancelled successfully")
            else:
                self.log_result("Appointments - Cancel", False, f"Unexpected cancel response: {cancel_result}")
        
        return True

    def test_conversations_api(self):
        """Test Conversations/Messages API (Medium Priority, requires authentication)"""
        print("\n=== Testing Conversations/Messages API ===")
        
        if not self.access_token:
            self.log_result("Conversations API", False, "No authentication token available")
            return False
            
        # Test 1: Get conversations (should be empty initially)
        response = self.make_request('GET', '/conversations', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get conversations failed with status {response.status_code if response else 'No response'}"
            self.log_result("Conversations - Get All", False, error_msg)
        else:
            conversations = response.json()
            if isinstance(conversations, list):
                self.log_result("Conversations - Get All", True, f"Retrieved {len(conversations)} conversations")
            else:
                self.log_result("Conversations - Get All", False, f"Invalid response format: {conversations}")
            
        # Test 2: Create a new conversation
        conversation_data = {
            "other_user_id": str(uuid.uuid4()),  # Fake user ID for testing
            "initial_message": "Hello! I'm interested in adopting the golden retriever you posted. Is he still available?"
        }
        
        response = self.make_request('POST', '/conversations', conversation_data, auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Create conversation failed with status {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    error_msg += f": {error_detail}"
                except:
                    error_msg += f": {response.text}"
            self.log_result("Conversations - Create", False, error_msg)
            return False
            
        conversation_result = response.json()
        conversation_id = conversation_result.get("conversation_id")
        if not conversation_id:
            self.log_result("Conversations - Create", False, f"Missing conversation ID: {conversation_result}")
            return False
            
        self.log_result("Conversations - Create", True, f"Conversation created with ID: {conversation_id}")
        
        # Test 3: Get messages in conversation
        response = self.make_request('GET', f'/conversations/{conversation_id}/messages', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Get messages failed with status {response.status_code if response else 'No response'}"
            self.log_result("Conversations - Get Messages", False, error_msg)
        else:
            messages = response.json()
            if isinstance(messages, list):
                self.log_result("Conversations - Get Messages", True, f"Retrieved {len(messages)} messages")
            else:
                self.log_result("Conversations - Get Messages", False, f"Invalid response format: {messages}")
                
        # Test 4: Send a message
        message_content = "Yes, he's still available! Would you like to schedule a meet and greet?"
        response = self.make_request('POST', f'/conversations/{conversation_id}/messages?content={message_content}', auth_required=True)
        if not response or response.status_code != 200:
            error_msg = f"Send message failed with status {response.status_code if response else 'No response'}"
            self.log_result("Conversations - Send Message", False, error_msg)
        else:
            message_result = response.json()
            if message_result.get('content') == message_content:
                self.log_result("Conversations - Send Message", True, "Message sent successfully")
            else:
                self.log_result("Conversations - Send Message", False, f"Message content mismatch: {message_result}")
        
        return True

    def test_cart_api(self):
        """Test Cart API (mentioned in test_result.md but not implemented in server.py)"""
        print("\n=== Testing Cart API ===")
        
        if not self.access_token:
            self.log_result("Cart API", False, "No authentication token available")
            return False
            
        # Note: Cart API endpoints are not implemented in the server.py file
        # Testing to confirm they don't exist
        
        # Test 1: Try to get cart
        response = self.make_request('GET', '/cart', auth_required=True)
        if response and response.status_code == 404:
            self.log_result("Cart - Get Cart", False, "Cart API endpoint not implemented (404 Not Found)")
        elif response and response.status_code == 200:
            cart_data = response.json()
            self.log_result("Cart - Get Cart", True, f"Cart endpoint exists and returned: {cart_data}")
        else:
            error_msg = f"Cart get failed with status {response.status_code if response else 'No response'}"
            self.log_result("Cart - Get Cart", False, error_msg)
            
        # Test 2: Try to add to cart
        cart_item_data = {
            "product_id": str(uuid.uuid4()),
            "quantity": 2
        }
        response = self.make_request('POST', '/cart/add', cart_item_data, auth_required=True)
        if response and response.status_code == 404:
            self.log_result("Cart - Add Item", False, "Cart add API endpoint not implemented (404 Not Found)")
        elif response and response.status_code == 200:
            add_result = response.json()
            self.log_result("Cart - Add Item", True, f"Cart add endpoint exists and returned: {add_result}")
        else:
            error_msg = f"Cart add failed with status {response.status_code if response else 'No response'}"
            self.log_result("Cart - Add Item", False, error_msg)
            
        # Test 3: Try to update cart item
        update_data = {
            "product_id": str(uuid.uuid4()),
            "quantity": 3
        }
        response = self.make_request('PUT', '/cart/update', update_data, auth_required=True)
        if response and response.status_code == 404:
            self.log_result("Cart - Update Item", False, "Cart update API endpoint not implemented (404 Not Found)")
        elif response and response.status_code == 200:
            update_result = response.json()
            self.log_result("Cart - Update Item", True, f"Cart update endpoint exists and returned: {update_result}")
        else:
            error_msg = f"Cart update failed with status {response.status_code if response else 'No response'}"
            self.log_result("Cart - Update Item", False, error_msg)
            
        # Test 4: Try to remove from cart
        response = self.make_request('DELETE', f'/cart/remove?product_id={str(uuid.uuid4())}', auth_required=True)
        if response and response.status_code == 404:
            self.log_result("Cart - Remove Item", False, "Cart remove API endpoint not implemented (404 Not Found)")
        elif response and response.status_code == 200:
            remove_result = response.json()
            self.log_result("Cart - Remove Item", True, f"Cart remove endpoint exists and returned: {remove_result}")
        else:
            error_msg = f"Cart remove failed with status {response.status_code if response else 'No response'}"
            self.log_result("Cart - Remove Item", False, error_msg)
        
        return True

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