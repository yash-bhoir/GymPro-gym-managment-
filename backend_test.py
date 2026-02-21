#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from time import sleep

class GymAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.admin_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.super_admin_token = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "status": "PASS" if success else "FAIL",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {'PASS' if success else 'FAIL'}")
        if details:
            print(f"   Details: {details}")

    def make_request(self, method, endpoint, data=None, auth_required=True):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'

        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            print(f"   Request: {method} {url} -> {response.status_code}")
            return response
        except Exception as e:
            print(f"   Request Error: {method} {url} -> {str(e)}")
            return None

    def test_health_check(self):
        """Test if backend is running"""
        print("\n🔍 Testing Backend Health...")
        try:
            # Try to hit a protected endpoint
            response = requests.get(f"{self.base_url}/api/auth/me", timeout=5)
            # 401 or 403 means API is working (different auth error codes)
            success = response.status_code in [401, 403]
            self.log_test("Backend Health Check", success, f"Status: {response.status_code} (API responding)")
            return success
        except Exception as e:
            self.log_test("Backend Health Check", False, f"Error: {str(e)}")
            return False

    def test_register_admin(self):
        """Test admin registration"""
        print("\n🔍 Testing Admin Registration...")
        test_email = f"admin_{datetime.now().strftime('%H%M%S')}@test.com"
        payload = {
            "full_name": "Test Admin",
            "email": test_email,
            "password": "TestPass123!",
            "confirm_password": "TestPass123!"
        }
        
        response = self.make_request('POST', '/auth/register', payload, auth_required=False)
        
        if response and response.status_code == 200:
            self.test_email = test_email
            self.log_test("Admin Registration", True, "Registration successful")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Admin Registration", False, details)
            return False

    def test_otp_verification(self):
        """Test OTP verification (will fail without real OTP)"""
        print("\n🔍 Testing OTP Verification...")
        if not hasattr(self, 'test_email'):
            self.log_test("OTP Verification", False, "No email from registration")
            return False
            
        payload = {
            "email": self.test_email,
            "otp": "123456"  # Test OTP (will fail)
        }
        
        response = self.make_request('POST', '/auth/verify-otp', payload, auth_required=False)
        
        # Expected to fail due to invalid OTP
        if response and response.status_code == 400:
            self.log_test("OTP Verification", True, "Correctly rejected invalid OTP")
            return True
        else:
            status = response.status_code if response else "No response"
            details = f"Expected 400 for invalid OTP, got {status}"
            if response:
                details += f" - {response.text}"
            self.log_test("OTP Verification", False, details)
            return False

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        print("\n🔍 Testing Invalid Login...")
        payload = {
            "email": "invalid@test.com",
            "password": "wrongpass"
        }
        
        response = self.make_request('POST', '/auth/login', payload, auth_required=False)
        
        if response and response.status_code == 401:
            self.log_test("Invalid Login Rejection", True, "Correctly rejected invalid credentials")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Invalid Login Rejection", False, details)
            return False

    def test_google_login_without_client_id(self):
        """Test Google login when client ID is not configured"""
        print("\n🔍 Testing Google Login (No Client ID)...")
        payload = {
            "id_token": "fake_google_token"
        }
        
        response = self.make_request('POST', '/auth/google', payload, auth_required=False)
        
        if response and response.status_code == 400:
            self.log_test("Google Login Without Config", True, "Correctly rejected when no client ID")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Google Login Without Config", False, details)
            return False

    def test_forgot_password(self):
        """Test forgot password flow"""
        print("\n🔍 Testing Forgot Password...")
        if not hasattr(self, 'test_email'):
            self.log_test("Forgot Password", False, "No email from registration")
            return False
            
        payload = {
            "email": self.test_email
        }
        
        response = self.make_request('POST', '/auth/forgot-password', payload, auth_required=False)
        
        if response and response.status_code == 200:
            self.log_test("Forgot Password", True, "OTP generation successful")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Forgot Password", False, details)
            return False

    def test_super_admin_login(self):
        """Test super admin login with provided credentials"""
        print("\n🔍 Testing Super Admin Login...")
        payload = {
            "email": "yash@prudencesoftware.com",
            "password": "Spidy@1104"
        }
        
        response = self.make_request('POST', '/auth/login', payload, auth_required=False)
        
        if response and response.status_code == 200:
            data = response.json()
            self.super_admin_token = data.get('access_token')
            admin_info = data.get('admin', {})
            
            if admin_info.get('role') == 'super_admin':
                self.log_test("Super Admin Login", True, f"Logged in as {admin_info.get('full_name')} with super_admin role")
                return True
            else:
                self.log_test("Super Admin Login", False, f"Role is {admin_info.get('role')}, expected super_admin")
                return False
        else:
            details = response.text if response else "Request failed"
            self.log_test("Super Admin Login", False, details)
            return False
    
    def test_super_dashboard_summary(self):
        """Test super admin dashboard summary"""
        print("\n🔍 Testing Super Dashboard Summary...")
        
        if not self.super_admin_token:
            self.log_test("Super Dashboard Summary", False, "No super admin token")
            return False

        # Temporarily use super admin token
        original_token = self.access_token
        self.access_token = self.super_admin_token
        
        response = self.make_request('GET', '/super/summary')
        
        # Restore original token
        self.access_token = original_token
        
        if response and response.status_code == 200:
            summary = response.json()
            required_fields = ['total_admins', 'total_members', 'active_members', 'expired_members', 'pending_payments', 'total_revenue', 'monthly_revenue']
            missing_fields = [field for field in required_fields if field not in summary]
            
            if not missing_fields:
                self.log_test("Super Dashboard Summary", True, f"All required fields present. Total admins: {summary.get('total_admins')}, Total members: {summary.get('total_members')}")
                return True
            else:
                self.log_test("Super Dashboard Summary", False, f"Missing fields: {missing_fields}")
                return False
        else:
            details = response.text if response else "Request failed"
            self.log_test("Super Dashboard Summary", False, details)
            return False
    
    def test_super_admin_list(self):
        """Test super admin list functionality"""
        print("\n🔍 Testing Super Admin List...")
        
        if not self.super_admin_token:
            self.log_test("Super Admin List", False, "No super admin token")
            return False

        # Temporarily use super admin token
        original_token = self.access_token
        self.access_token = self.super_admin_token
        
        response = self.make_request('GET', '/super/admins', data=None)
        
        # Restore original token
        self.access_token = original_token
        
        if response and response.status_code == 200:
            data = response.json()
            admins = data.get('admins', [])
            total = data.get('total', 0)
            self.log_test("Super Admin List", True, f"Retrieved {len(admins)} admins out of {total} total")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Super Admin List", False, details)
            return False
    
    def test_super_members_list(self):
        """Test super members list functionality"""
        print("\n🔍 Testing Super Members List...")
        
        if not self.super_admin_token:
            self.log_test("Super Members List", False, "No super admin token")
            return False

        # Temporarily use super admin token
        original_token = self.access_token
        self.access_token = self.super_admin_token
        
        response = self.make_request('GET', '/super/members', data=None)
        
        # Restore original token
        self.access_token = original_token
        
        if response and response.status_code == 200:
            data = response.json()
            members = data.get('members', [])
            total = data.get('total', 0)
            self.log_test("Super Members List", True, f"Retrieved {len(members)} members out of {total} total")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Super Members List", False, details)
            return False

    def test_regular_admin_access_to_super_routes(self):
        """Test that regular admin cannot access super admin routes"""
        print("\n🔍 Testing Regular Admin Access to Super Routes...")
        
        if not self.access_token:
            self.log_test("Regular Admin Super Access", False, "No regular admin token")
            return False

        super_routes = ['/super/summary', '/super/admins', '/super/members']
        all_blocked = True
        
        for route in super_routes:
            response = self.make_request('GET', route)
            if response and response.status_code == 403:
                self.log_test(f"Block Regular Access {route}", True, "Correctly blocked regular admin")
            else:
                all_blocked = False
                status = response.status_code if response else "No response"
                self.log_test(f"Block Regular Access {route}", False, f"Expected 403, got {status}")
        
        return all_blocked

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        print("\n🔍 Testing Invalid Login...")
        payload = {
            "email": "invalid@test.com",
            "password": "wrongpass"
        }
        
        response = self.make_request('POST', '/auth/login', payload, auth_required=False)
        
        if response and response.status_code == 401:
            self.log_test("Invalid Login Rejection", True, "Correctly rejected invalid credentials")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Invalid Login Rejection", False, details)
            return False

    def test_google_login_without_client_id(self):
        """Test Google login when client ID is not configured"""
        print("\n🔍 Testing Google Login (No Client ID)...")
        payload = {
            "id_token": "fake_google_token"
        }
        
        response = self.make_request('POST', '/auth/google', payload, auth_required=False)
        
        if response and response.status_code in [400, 401]:
            self.log_test("Google Login Without Valid Token", True, "Correctly rejected invalid Google token")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Google Login Without Valid Token", False, details)
            return False
            
    def test_package_crud(self):
        print("\n🔍 Testing Package CRUD...")
        
        if not self.access_token:
            self.log_test("Package CRUD", False, "No access token")
            return False

        # Create package
        payload = {
            "name": "Monthly Package",
            "duration_days": 30,
            "price": 1500.0,
            "description": "Basic monthly membership"
        }
        
        response = self.make_request('POST', '/packages', payload)
        if not response or response.status_code != 200:
            self.log_test("Package Creation", False, "Failed to create package")
            return False
        
        package_id = response.json().get("package", {}).get("id")
        if not package_id:
            self.log_test("Package Creation", False, "No package ID returned")
            return False
        
        self.log_test("Package Creation", True, f"Package created with ID: {package_id}")
        
        # List packages
        response = self.make_request('GET', '/packages')
        if response and response.status_code == 200:
            packages = response.json().get("packages", [])
            self.log_test("Package List", True, f"Found {len(packages)} packages")
        else:
            self.log_test("Package List", False, "Failed to fetch packages")
        
        # Update package
        update_payload = {
            "name": "Updated Monthly Package",
            "price": 1800.0
        }
        response = self.make_request('PUT', f'/packages/{package_id}', update_payload)
        if response and response.status_code == 200:
            self.log_test("Package Update", True, "Package updated successfully")
        else:
            self.log_test("Package Update", False, "Failed to update package")
        
        # Store package ID for member tests
        self.test_package_id = package_id
        return True

    def test_members_crud(self):
        """Test member CRUD operations"""
        print("\n🔍 Testing Member CRUD...")
        
        if not self.access_token:
            self.log_test("Member CRUD", False, "No access token")
            return False
        
        if not hasattr(self, 'test_package_id'):
            self.log_test("Member CRUD", False, "No package ID available")
            return False

        # Create member
        payload = {
            "full_name": "John Doe",
            "phone_number": "9876543210",
            "email": "john.doe@test.com",
            "address": "123 Test Street",
            "joining_date": datetime.now().isoformat(),
            "package_id": self.test_package_id,
            "paid_amount": 1000.0,
            "payment_method": "Cash"
        }
        
        response = self.make_request('POST', '/members', payload)
        if not response or response.status_code != 200:
            details = response.text if response else "Request failed"
            self.log_test("Member Creation", False, details)
            return False
        
        member_data = response.json().get("member", {})
        member_id = member_data.get("id")
        if not member_id:
            self.log_test("Member Creation", False, "No member ID returned")
            return False
        
        self.log_test("Member Creation", True, f"Member created with ID: {member_id}")
        
        # List members
        response = self.make_request('GET', '/members')
        if response and response.status_code == 200:
            members = response.json().get("members", [])
            self.log_test("Member List", True, f"Found {len(members)} members")
        else:
            self.log_test("Member List", False, "Failed to fetch members")
        
        # Get specific member
        response = self.make_request('GET', f'/members/{member_id}')
        if response and response.status_code == 200:
            self.log_test("Member Details", True, "Member details retrieved")
        else:
            self.log_test("Member Details", False, "Failed to get member details")
        
        # Add payment to member
        payment_payload = {
            "amount": 500.0,
            "method": "UPI",
            "transaction_id": "TXN123456",
            "note": "Additional payment"
        }
        response = self.make_request('POST', f'/members/{member_id}/payments', payment_payload)
        if response and response.status_code == 200:
            self.log_test("Add Payment", True, "Payment added successfully")
        else:
            self.log_test("Add Payment", False, "Failed to add payment")
        
        # Get payment history
        response = self.make_request('GET', f'/members/{member_id}/payments')
        if response and response.status_code == 200:
            history = response.json().get("payment_history", [])
            self.log_test("Payment History", True, f"Found {len(history)} payment records")
        else:
            self.log_test("Payment History", False, "Failed to get payment history")
        
        self.test_member_id = member_id
        return True

    def test_dashboard_summary(self):
        """Test dashboard summary API"""
        print("\n🔍 Testing Dashboard Summary...")
        
        if not self.access_token:
            self.log_test("Dashboard Summary", False, "No access token")
            return False

        response = self.make_request('GET', '/dashboard/summary')
        if response and response.status_code == 200:
            summary = response.json()
            required_fields = ['total_members', 'active_members', 'expired_members', 'pending_payments', 'total_revenue', 'monthly_revenue', 'upcoming_expirations']
            missing_fields = [field for field in required_fields if field not in summary]
            
            if not missing_fields:
                self.log_test("Dashboard Summary", True, "All required fields present")
                return True
            else:
                self.log_test("Dashboard Summary", False, f"Missing fields: {missing_fields}")
                return False
        else:
            details = response.text if response else "Request failed"
            self.log_test("Dashboard Summary", False, details)
            return False

    def test_settings_crud(self):
        """Test settings CRUD operations"""
        print("\n🔍 Testing Settings CRUD...")
        
        if not self.access_token:
            self.log_test("Settings CRUD", False, "No access token")
            return False

        # Get settings
        response = self.make_request('GET', '/settings')
        if response and response.status_code == 200:
            self.log_test("Get Settings", True, "Settings retrieved")
        else:
            self.log_test("Get Settings", False, "Failed to get settings")
            return False

        # Update settings
        payload = {
            "smtp": {
                "email": "test@gmail.com",
                "app_password": "testpass",
                "enabled": False
            },
            "whatsapp": {
                "access_token": "test_token",
                "phone_number_id": "123456789",
                "business_id": "test_business",
                "enabled": False
            },
            "reminders": {
                "days_before_expiry": [1, 3, 7],
                "reminder_type": "email",
                "payment_pending_enabled": True
            }
        }
        
        response = self.make_request('PUT', '/settings', payload)
        if response and response.status_code == 200:
            self.log_test("Update Settings", True, "Settings updated")
        else:
            details = response.text if response else "Request failed"
            self.log_test("Update Settings", False, details)

        return True

    def test_reminders(self):
        """Test reminder sending functionality"""
        print("\n🔍 Testing Reminders...")
        
        if not self.access_token:
            self.log_test("Send Reminder", False, "No access token")
            return False
        
        if not hasattr(self, 'test_member_id'):
            self.log_test("Send Reminder", False, "No member ID available")
            return False

        payload = {
            "member_id": self.test_member_id,
            "reminder_type": "email"
        }
        
        response = self.make_request('POST', '/reminders/send', payload)
        
        # Expected to fail due to no SMTP configuration
        if response and response.status_code == 400:
            self.log_test("Send Reminder", True, "Correctly handled unconfigured SMTP")
            return True
        elif response and response.status_code == 200:
            self.log_test("Send Reminder", True, "Reminder sent successfully")
            return True
        else:
            details = response.text if response else "Request failed"
            self.log_test("Send Reminder", False, details)
            return False

    def test_protected_routes_without_auth(self):
        """Test protected routes without authentication"""
        print("\n🔍 Testing Protected Routes Without Auth...")
        
        # Temporarily remove token
        original_token = self.access_token
        self.access_token = None
        
        endpoints = ['/dashboard/summary', '/packages', '/members', '/settings']
        
        for endpoint in endpoints:
            response = self.make_request('GET', endpoint)
            if response and response.status_code in [401, 403]:
                self.log_test(f"Protected Route {endpoint}", True, f"Correctly rejected unauthorized access ({response.status_code})")
            else:
                status = response.status_code if response else "No response"
                self.log_test(f"Protected Route {endpoint}", False, f"Expected 401/403, got {status}")
        
        # Restore token
        self.access_token = original_token
        return True

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Gym Membership Management API Tests")
        print(f"Base URL: {self.base_url}")
        
        # Test 1: Health check
        if not self.test_health_check():
            print("❌ Backend is not accessible. Stopping tests.")
            return False
        
        # Test 2: Super Admin Login (Priority test)
        if not self.test_super_admin_login():
            print("❌ Super Admin login failed. This is critical for the app.")
            return False
        
        # Test 3: Super Admin Dashboard
        if not self.test_super_dashboard_summary():
            print("⚠️ Super admin dashboard failed")
        
        # Test 4: Super Admin List
        if not self.test_super_admin_list():
            print("⚠️ Super admin list failed")
        
        # Test 5: Super Members List
        if not self.test_super_members_list():
            print("⚠️ Super members list failed")
        
        # Test 6: Registration
        if not self.test_register_admin():
            print("❌ Registration failed. Stopping regular admin tests.")
        else:
            # Test 7: OTP verification (expected to fail)
            self.test_otp_verification()
            
            # Test 8: Regular admin access to super routes
            self.test_regular_admin_access_to_super_routes()
        
        # Test 9: Invalid login
        self.test_login_invalid()
        
        # Test 10: Google login without valid token
        self.test_google_login_without_client_id()
        
        # Test 11: Forgot password
        self.test_forgot_password()
        
        # Test 12: Protected routes without auth
        self.test_protected_routes_without_auth()
        
        # Test summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed/self.tests_run)*100 if self.tests_run > 0 else 0
        
        if success_rate >= 80:
            print(f"✅ {success_rate:.1f}% tests passed - Good!")
            return True
        else:
            print(f"❌ Only {success_rate:.1f}% tests passed - Issues found")
            return False

def main():
    # Test with localhost since external URL has access restrictions
    backend_url = "http://localhost:8001"
    
    print("🏋️ Gym Membership Management API Testing")
    print("=" * 50)
    print("Note: Testing locally - frontend will use Vite proxy for integration")
    
    tester = GymAPITester(backend_url)
    success = tester.run_all_tests()
    
    # Save test results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    with open(f'/app/test_results_{timestamp}.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "0%"
            },
            'test_results': tester.test_results,
            'timestamp': timestamp
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())