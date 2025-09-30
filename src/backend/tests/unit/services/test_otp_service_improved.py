"""Improved tests for OTP service with reduced mocking scope."""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock
from freezegun import freeze_time

from interfaces import DatabaseClient, SMSClient, ConfigProvider
from services.otp.otp_service import OTPService


# Mock implementations that behave like real interfaces
class MockDatabaseClient(DatabaseClient):
    def __init__(self):
        self.data = {}
        
    def table(self, name: str):
        return MockTableClient(self, name)


class MockTableClient:
    def __init__(self, db_client, table_name):
        self.db_client = db_client
        self.table_name = table_name
        
    def select(self, columns="*", count=None):
        return MockQueryBuilder(self, "select", {"columns": columns, "count": count})
    
    def insert(self, data):
        return MockQueryBuilder(self, "insert", {"data": data})
    
    def update(self, data):
        return MockQueryBuilder(self, "update", {"data": data})


class MockQueryBuilder:
    def __init__(self, table_client, operation, params):
        self.table_client = table_client
        self.operation = operation
        self.params = params
        self.filters = {}
    
    def eq(self, column, value):
        self.filters[column] = value
        return self
    
    def gt(self, column, value):
        self.filters[f"{column}_gt"] = value
        return self
    
    def gte(self, column, value):
        self.filters[f"{column}_gte"] = value
        return self
    
    def order(self, column, desc=False):
        self.order_column = column
        self.order_desc = desc
        return self
    
    def limit(self, count):
        self.limit_count = count
        return self
    
    def execute(self):
        table_name = self.table_client.table_name
        db = self.table_client.db_client
        
        if self.operation == "select":
            data = db.data.get(table_name, [])
            # Apply filters
            filtered_data = []
            for item in data:
                match = True
                for key, value in self.filters.items():
                    if key.endswith("_gte"):
                        actual_key = key[:-4]
                        if actual_key in item and item[actual_key] < value:
                            match = False
                            break
                    elif key in item and item[key] != value:
                        match = False
                        break
                if match:
                    filtered_data.append(item)
            
            return MockQueryResult(filtered_data, len(filtered_data))
        
        elif self.operation == "insert":
            if table_name not in db.data:
                db.data[table_name] = []
            new_item = self.params["data"].copy()
            new_item["id"] = f"test-id-{len(db.data[table_name])}"
            
            # Set default values for phone_otps table to match real schema
            if table_name == "phone_otps":
                new_item.setdefault("attempts", 0)
                new_item.setdefault("used", False)
            
            db.data[table_name].append(new_item)
            return MockQueryResult([new_item])
        
        elif self.operation == "update":
            data = db.data.get(table_name, [])
            updated_items = []
            for item in data:
                match = True
                for key, value in self.filters.items():
                    if key in item and item[key] != value:
                        match = False
                        break
                if match:
                    item.update(self.params["data"])
                    updated_items.append(item)
            return MockQueryResult(updated_items)
        
        return MockQueryResult([])


class MockQueryResult:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count if count is not None else len(data)


class MockSMSClient(SMSClient):
    def __init__(self, success=True):
        self.success = success
        self.sent_messages = []
    
    def send(self, phone: str, message: str) -> bool:
        self.sent_messages.append({"phone": phone, "message": message})
        return self.success
    
    def send_otp(self, phone: str, otp_code: str) -> dict:
        """Alternative method name for backward compatibility."""
        success = self.send(phone, f"Your OTP: {otp_code}")
        return {"success": success, "provider_msg_id": f"test-{len(self.sent_messages)}"}


class MockConfigProvider(ConfigProvider):
    def __init__(self):
        self.config = {
            "otp_validity_minutes": 5,
            "otp_max_verification_attempts": 6,
            "otp_resend_limit_per_15min": 3,
            "otp_resend_limit_per_day": 10,
            "otp_secret_key": "test-secret-key"
        }
    
    def get(self, key, default=None):
        return self.config.get(key, default)
    
    def get_supabase_url(self):
        return "https://test.supabase.co"
    
    def get_supabase_key(self):
        return "test-key"
    
    def get_otp_secret_key(self):
        return self.config["otp_secret_key"]
    
    def get_otp_validity_minutes(self):
        return self.config["otp_validity_minutes"]
    
    def get_otp_max_verification_attempts(self):
        return self.config["otp_max_verification_attempts"]
    
    def get_otp_resend_limit_per_15min(self):
        return self.config["otp_resend_limit_per_15min"]
    
    def get_otp_resend_limit_per_day(self):
        return self.config["otp_resend_limit_per_day"]


class TestOTPServiceImproved:
    """Improved OTP service tests with minimal mocking."""
    
    @pytest.fixture
    def mock_db_client(self):
        return MockDatabaseClient()
    
    @pytest.fixture
    def mock_sms_client(self):
        return MockSMSClient(success=True)
    
    @pytest.fixture
    def mock_config(self):
        return MockConfigProvider()
    
    @pytest.fixture
    def otp_service(self, mock_db_client, mock_sms_client, mock_config):
        return OTPService(mock_db_client, mock_sms_client, mock_config)
    
    def test_rate_limiting_logic_with_real_data_structures(self, otp_service):
        """Test rate limiting with realistic data structures instead of mocks."""
        phone = "01012345678"
        
        # Simulate existing OTP records that would trigger rate limit
        existing_otps = [
            {
                "phone": phone,
                "created_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "attempts": 1
            },
            {
                "phone": phone, 
                "created_at": (datetime.now() - timedelta(minutes=10)).isoformat(),
                "attempts": 2
            },
            {
                "phone": phone,
                "created_at": (datetime.now() - timedelta(minutes=12)).isoformat(), 
                "attempts": 1
            }
        ]
        
        # Add data to mock database
        otp_service.db_client.data["phone_otps"] = existing_otps
        
        # Test rate limiting - should be blocked (3 requests in 15 minutes)
        allowed, reason = otp_service._check_rate_limits(phone)
        assert not allowed
        assert "few minutes" in reason.lower()
    
    def test_otp_verification_business_logic(self, otp_service, mock_config):
        """Test OTP verification logic with real business rules."""
        phone = "01012345678"
        correct_code = "123456"
        
        # Set up valid OTP record in database
        from services.otp.utils import hash_otp
        code_hash = hash_otp(phone, correct_code)
        
        otp_record = {
            "id": "test-otp-1",
            "phone": phone,
            "code_hash": code_hash,
            "attempts": 0,
            "used": False,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()
        }
        
        otp_service.db_client.data["phone_otps"] = [otp_record]
        
        # Test correct code verification
        result = otp_service.verify_otp(phone, correct_code)
        assert result["success"] is True
        assert "성공" in result["message"]
        
        # Verify database was updated (marked as used)
        updated_records = otp_service.db_client.data["phone_otps"]
        assert updated_records[0]["used"] is True
    
    def test_otp_attempt_limit_enforcement(self, otp_service, mock_config):
        """Test that attempt limits are properly enforced."""
        phone = "01012345678"
        wrong_code = "000000"
        
        # Set up OTP record near attempt limit
        from services.otp.utils import hash_otp
        code_hash = hash_otp(phone, "123456")
        
        otp_record = {
            "id": "test-otp-1", 
            "phone": phone,
            "code_hash": code_hash,
            "attempts": 5,  # One attempt left (max is 6)
            "used": False,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()
        }
        
        otp_service.db_client.data["phone_otps"] = [otp_record]
        
        # Test wrong code - should increment attempts and show remaining
        result = otp_service.verify_otp(phone, wrong_code)
        assert result["success"] is False
        assert result["remaining_attempts"] == 0
        
        # Verify attempts were incremented in database
        updated_record = otp_service.db_client.data["phone_otps"][0]
        assert updated_record["attempts"] == 6
    
    def test_sms_integration_without_external_dependency(self, mock_db_client, mock_config):
        """Test SMS integration using mock that behaves like real client."""
        # Use mock SMS client that tracks sent messages
        sms_client = MockSMSClient(success=True)
        otp_service = OTPService(mock_db_client, sms_client, mock_config)
        
        phone = "01012345678"
        
        # Request OTP
        result = otp_service.request_otp(phone)
        
        # Verify SMS was sent (without external dependency)
        assert len(sms_client.sent_messages) == 1
        sent_message = sms_client.sent_messages[0]
        assert sent_message["phone"] == phone
        # Check that message contains some form of OTP/verification code
        message_lower = sent_message["message"].lower()
        assert any(word in message_lower for word in ["otp", "code", "verification", "인증"])
        
        # Verify OTP was stored in database
        otp_records = mock_db_client.data.get("phone_otps", [])
        assert len(otp_records) == 1
        assert otp_records[0]["phone"] == phone
    
    def test_configuration_dependency_injection(self):
        """Test that configuration is properly injected and used.""" 
        # Create custom config with different limits
        custom_config = MockConfigProvider()
        custom_config.config["otp_max_verification_attempts"] = 3  # Lower limit
        
        db_client = MockDatabaseClient()
        sms_client = MockSMSClient()
        otp_service = OTPService(db_client, sms_client, custom_config)
        
        # Set up OTP record at custom limit
        from services.otp.utils import hash_otp
        code_hash = hash_otp("01012345678", "123456")
        
        otp_record = {
            "id": "test-otp-1",
            "phone": "01012345678", 
            "code_hash": code_hash,
            "attempts": 3,  # At custom limit
            "used": False,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()
        }
        
        db_client.data["phone_otps"] = [otp_record]
        
        # Verify custom limit is enforced
        result = otp_service.verify_otp("01012345678", "000000")
        assert result["success"] is False
        assert "시도 횟수를 초과" in result["message"]


# This shows how to test integration with real-like behavior but controlled data
class TestOTPServiceIntegrationStyle:
    """Integration-style tests that use interfaces but avoid external I/O."""
    
    def test_complete_otp_workflow(self):
        """Test complete workflow from request to verification."""
        # Setup services with predictable behavior
        db_client = MockDatabaseClient()
        sms_client = MockSMSClient(success=True)
        config = MockConfigProvider()
        otp_service = OTPService(db_client, sms_client, config)
        
        phone = "01012345678"
        
        # Step 1: Request OTP
        result = otp_service.request_otp(phone)
        assert result["success"] is True
        
        # Step 2: Extract OTP code from database (simulating what user would receive via SMS)
        otp_records = db_client.data["phone_otps"]
        assert len(otp_records) == 1
        stored_record = otp_records[0]
        
        # Simulate user entering correct code (we need to reverse-engineer this for testing)
        # Extract the OTP code from the SMS message for verification test
        sent_message = sms_client.sent_messages[0]["message"]
        # Parse the OTP from "Your OTP: 123456" format
        if "Your OTP: " in sent_message:
            correct_code = sent_message.split("Your OTP: ")[1].strip()
        else:
            # Fallback: use a known test code
            correct_code = "123456"
        
        assert correct_code is not None and len(correct_code) > 0, "Could not extract OTP code from SMS"
        
        # Step 3: Verify OTP
        verify_result = otp_service.verify_otp(phone, correct_code)
        assert verify_result["success"] is True
        
        # Step 4: Verify database state was updated correctly
        updated_record = db_client.data["phone_otps"][0]
        assert updated_record["used"] is True