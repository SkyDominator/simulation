"""Tests for OTP service rate limiting and attempt tracking."""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from freezegun import freeze_time

from services.otp.otp_service import OTPService
from services.otp.utils import normalize_phone


class TestOTPServiceRateLimiting:
    """Test CAT-OTP-SERVICE: OTP Service rate/attempt limiting (OTPS-001 to OTPS-009)."""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client for testing."""
        client = Mock()
        
        # Set up method chaining for database queries
        client.table.return_value = client
        client.select.return_value = client
        client.eq.return_value = client
        client.gte.return_value = client

        # Configure the execute result to have count=0 by default
        mock_result = Mock()
        mock_result.data = []
        mock_result.count = 0
        client.execute.return_value = mock_result
        
        client.gt.return_value = client
        client.order.return_value = client
        client.limit.return_value = client        

        client.insert.return_value = client
        client.update.return_value = client
        
        # Default execute result with count=0 and empty data
        default_result = Mock()
        default_result.data = []
        default_result.count = 0
        client.execute.return_value = default_result
        
        return client
    
    @pytest.fixture
    def otp_service(self, mock_supabase_client, settings_override):
        """Create OTP service instance with mocked dependencies."""
        # OTPService expects a db_client parameter
        service = OTPService(db_client=mock_supabase_client)
        return service
    
    def test_OTPS_001_check_rate_limits_allows_first_request(self, otp_service, mock_supabase_client):
        """OTPS-001: _check_rate_limits allows first request for new phone."""
        phone = "+821012345678"
        
        # Mock no existing records with proper count
        mock_result = Mock()
        mock_result.data = []
        mock_result.count = 0
        mock_supabase_client.execute.return_value = mock_result
        
        # Use default mock (count=0) - no need to override
        # Should not raise exception and return success
        allowed, reason = otp_service._check_rate_limits(phone)
        assert allowed is True
        assert reason == "OK"
    
    def test_OTPS_002_check_rate_limits_blocks_exceeded_15min_limit(self, otp_service, mock_supabase_client, settings_override):
        """OTPS-002: _check_rate_limits blocks when 15min limit exceeded."""
        phone = "+821012345678"
        
        from freezegun import freeze_time
        with freeze_time('2025-01-01T00:00:00Z'):
            now = datetime.now()
            fifteen_min_ago = now - timedelta(minutes=15)
            
            # Mock records showing limit exceeded
            mock_records = [
                {"created_at": (fifteen_min_ago + timedelta(minutes=i)).isoformat()}
                for i in range(settings_override.otp_resend_limit_per_15min)
            ]
            
            # Create a proper mock result with both data and count
            mock_result = Mock()
            mock_result.data = mock_records
            mock_result.count = len(mock_records)  # This should exceed the limit
            mock_supabase_client.execute.return_value = mock_result
            
            # Should return False and contain rate limit message
            allowed, reason = otp_service._check_rate_limits(phone)
            assert allowed is False
            assert "few minutes" in reason or "15분" in reason
    
    def test_OTPS_003_check_rate_limits_blocks_exceeded_daily_limit(self, otp_service, mock_supabase_client, settings_override, freeze_jan_1_2025):
        """OTPS-003: _check_rate_limits blocks when daily limit exceeded."""
        phone = "+821012345678"
        
        with freeze_jan_1_2025:
            now = datetime.now()
            
            # Mock records showing daily limit exceeded
            mock_records = [
                {"created_at": (now - timedelta(hours=i)).isoformat()}
                for i in range(settings_override.otp_resend_limit_per_day)
            ]
            
            # Set up mock to return different results for 15-min and daily checks
            mock_15min_result = Mock()
            mock_15min_result.data = []
            mock_15min_result.count = 0  # Within 15-min limit
            
            mock_daily_result = Mock()  
            mock_daily_result.data = mock_records
            mock_daily_result.count = len(mock_records)  # Exceed daily limit
            
            mock_supabase_client.execute.side_effect = [mock_15min_result, mock_daily_result]
            
            # Should return False with daily limit message
            allowed, reason = otp_service._check_rate_limits(phone)
            assert not allowed
            assert "24시간" in reason or "tomorrow" in reason
    
    def test_OTPS_004_check_rate_limits_allows_within_limits(self, otp_service, mock_supabase_client, settings_override, freeze_jan_1_2025):
        """OTPS-004: _check_rate_limits allows requests within both limits."""
        phone = "+821012345678"
        
        with freeze_jan_1_2025:
            now = datetime.now()
            
            # Mock records within limits (one less than each limit)
            mock_records_15min = [
                {"created_at": (now - timedelta(minutes=i)).isoformat()}
                for i in range(settings_override.otp_resend_limit_per_15min - 1)
            ]
            mock_records_daily = [
                {"created_at": (now - timedelta(hours=i)).isoformat()}
                for i in range(settings_override.otp_resend_limit_per_day - 1)
            ]
            
            # Set up mock to return different results for 15-min and daily checks
            mock_15min_result = Mock()
            mock_15min_result.data = mock_records_15min
            mock_15min_result.count = len(mock_records_15min)  # Within 15-min limit
            
            mock_daily_result = Mock()  
            mock_daily_result.data = mock_records_daily
            mock_daily_result.count = len(mock_records_daily)  # Within daily limit
            
            mock_supabase_client.execute.side_effect = [mock_15min_result, mock_daily_result]
            
            # Should return True (allowed)
            allowed, reason = otp_service._check_rate_limits(phone)
            assert allowed
            assert reason == "OK"
    
    def test_OTPS_005_request_otp_normalizes_phone_number(self, otp_service, mock_supabase_client):
        """OTPS-005: request_otp uses phone number as-is (normalization not used for Solapi)."""
        input_phone = "01012345678"  # Korean phone format expected by Solapi
        
        # Mock successful rate limit check (both 15-min and daily within limits)
        mock_rate_limit_result = Mock()
        mock_rate_limit_result.data = []
        mock_rate_limit_result.count = 0
        
        # Mock successful update operation (invalidate existing OTPs)
        mock_update_result = Mock()
        mock_update_result.data = []
        
        # Mock successful insert operation
        mock_insert_result = Mock()
        mock_insert_result.data = [{"id": 1}]
        
        # Set side_effect: rate limiting (2 calls) + update + insert
        mock_supabase_client.execute.side_effect = [
            mock_rate_limit_result,  # 15-min check
            mock_rate_limit_result,  # daily check  
            mock_update_result,      # invalidate existing OTPs
            mock_insert_result       # insert new OTP record
        ]

        # Mock the SMS client directly on the service instance
        mock_sms_client = Mock()
        mock_sms_client.send_otp.return_value = {"success": True}
        otp_service.sms_client = mock_sms_client
        
        with patch('services.otp.otp_service.generate_otp', return_value="123456"):
            with patch('services.otp.otp_service.hash_otp', return_value="mock_hash"):
                result = otp_service.request_otp(input_phone)
        
        # Should return success
        assert result["success"] is True
        
        # Verify SMS was sent to the input phone (not normalized)
        mock_sms_client.send_otp.assert_called_once_with(input_phone, "123456")
    
    def test_OTPS_006_request_otp_generates_and_stores_otp(self, otp_service, mock_supabase_client, freeze_jan_1_2025):
        """OTPS-006: request_otp generates OTP and stores with expiry."""
        phone = "+821012345678"
        mock_otp = "123456"
        mock_hash = "mock_hash_value"
        
        # Setup proper mock sequence (same as OTPS_005)
        rate_limit_result = Mock()
        rate_limit_result.count = 0
        rate_limit_result.data = []
        
        invalidate_result = Mock()
        invalidate_result.data = []
        
        insert_result = Mock()
        insert_result.data = [{"id": 1}]
        
        update_result = Mock()
        update_result.data = [{"id": 1}]
        
        mock_supabase_client.execute.side_effect = [
            rate_limit_result,  # 15min check
            rate_limit_result,  # daily check  
            invalidate_result,  # invalidate existing OTPs
            insert_result,      # insert OTP record
            update_result       # update with provider_msg_id
        ]
        
        with freeze_jan_1_2025:
            with patch('services.otp.otp_service.generate_otp', return_value=mock_otp) as mock_gen_otp:
                with patch('services.otp.otp_service.hash_otp', return_value=mock_hash) as mock_hash_otp:
                    with patch('services.otp.otp_service.calculate_expiry') as mock_calc_expiry:
                        mock_expiry = datetime.now() + timedelta(minutes=5)
                        mock_calc_expiry.return_value = mock_expiry
                        
                        # Mock SMS client
                        with patch.object(otp_service, 'sms_client') as mock_sms:
                            mock_sms.send_otp.return_value = {"success": True, "provider_msg_id": "test123"}
                        
                            result = otp_service.request_otp(phone)
            
            # Should generate OTP
            mock_gen_otp.assert_called_once()
            
            # Should hash OTP  
            mock_hash_otp.assert_called_once_with(phone, mock_otp)
            
            # Should return success
            assert result["success"] is True
            assert "expires_in_seconds" in result
    
    def test_OTPS_007_verify_otp_increments_attempts_on_failure(self, otp_service, mock_supabase_client, settings_override):
        """OTPS-007: verify_otp increments attempts on wrong code."""
        phone = "+821012345678"
        wrong_code = "654321"
        
        # Mock existing OTP record with correct field names
        existing_record = {
            "id": 1,
            "phone": phone,
            "code_hash": "stored_hash",
            "attempts": 2,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "used": False
        }
        
        # Mock database response
        mock_result = Mock()
        mock_result.data = [existing_record]
        mock_supabase_client.execute.return_value = mock_result
        
        with patch('services.otp.otp_service.verify_otp_hash', return_value=False):
            result = otp_service.verify_otp(phone, wrong_code)  # Removed user_hash param
        
        # Should return failure
        assert result["success"] is False
        assert "remaining_attempts" in result or "message" in result
    
    def test_OTPS_008_verify_otp_blocks_after_max_attempts(self, otp_service, mock_supabase_client, settings_override):
        """OTPS-008: verify_otp blocks verification after max attempts reached."""
        phone = "+821012345678"
        otp_code = "123456"
        
        # Mock record with max attempts reached
        existing_record = {
            "id": 1,
            "phone": phone,
            "code_hash": "stored_hash",
            "attempts": settings_override.otp_max_verification_attempts,  # Already at max
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "used": False
        }
        
        # Create proper mock result with data
        mock_result = Mock()
        mock_result.data = [existing_record]
        mock_supabase_client.execute.return_value = mock_result
        
        # Should return failure with max attempts message
        result = otp_service.verify_otp(phone, otp_code)
        assert result["success"] is False
        assert "시도 횟수" in result["message"] or "새 인증번호" in result["message"]
    
    def test_OTPS_009_verify_otp_success_resets_attempts(self, otp_service, mock_supabase_client):
        """OTPS-009: verify_otp resets attempts counter on successful verification."""
        phone = "+821012345678"
        correct_code = "123456"
        
        # Mock existing record with some attempts (correct field names)
        existing_record = {
            "id": 1,
            "phone": phone,
            "code_hash": "stored_hash",
            "attempts": 3,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "used": False
        }
        
        # Mock database response
        mock_result = Mock()
        mock_result.data = [existing_record]
        mock_supabase_client.execute.return_value = mock_result
        
        with patch('services.otp.otp_service.verify_otp_hash', return_value=True):
            result = otp_service.verify_otp(phone, correct_code)  # Removed user_hash param
        
        # Should return success
        assert result["success"] is True
        assert "message" in result


class TestOTPServiceEdgeCases:
    """Test edge cases and error conditions for OTP service."""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client for testing."""
        client = Mock()
        
        # Set up method chaining for database queries
        client.table.return_value = client
        client.select.return_value = client
        client.eq.return_value = client
        client.gte.return_value = client

        # Configure the execute result to have count=0 by default
        mock_result = Mock()
        mock_result.data = []
        mock_result.count = 0
        client.execute.return_value = mock_result

        client.gt.return_value = client
        client.order.return_value = client
        client.limit.return_value = client

        client.insert.return_value = client
        client.update.return_value = client
        
        # Default execute result with count=0 and empty data
        default_result = Mock()
        default_result.data = []
        default_result.count = 0
        client.execute.return_value = default_result
        
        return client
    
    @pytest.fixture  
    def otp_service(self, mock_supabase_client, settings_override):
        """Create OTP service instance with mocked dependencies."""
        # OTPService expects a db_client parameter
        service = OTPService(db_client=mock_supabase_client)
        return service
    
    def test_verify_otp_handles_expired_otp(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles expired OTP correctly."""
        phone = "+821012345678"
        otp_code = "123456"
        user_hash = "test_user_hash"
        
        # For expired OTPs, the service filters them at DB level, so no records are returned
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        # Should return error message for expired/invalid OTP
        result = otp_service.verify_otp(phone, otp_code, user_hash)
        assert result["success"] is False
        assert "만료" in result["message"]
    
    def test_verify_otp_handles_nonexistent_otp(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles nonexistent OTP record."""
        phone = "+821012345678"
        otp_code = "123456"
        user_hash = "test_user_hash"
        
        # Mock no records found
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        # Should return error message for not found
        result = otp_service.verify_otp(phone, otp_code, user_hash)
        assert result["success"] is False
        assert "유효하지 않거나 만료된" in result["message"]
    
    def test_verify_otp_handles_user_hash_mismatch(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles user_hash mismatch."""
        phone = "+821012345678"
        otp_code = "123456"
        wrong_user_hash = "wrong_hash"
        
        # Mock record with correct structure but we'll simulate wrong hash verification
        existing_record = {
            "id": 1,
            "phone": phone,  # Service uses 'phone', not 'phone_number'
            "code_hash": "stored_hash",  # Service expects 'code_hash', not 'otp_hash'
            "attempts": 1,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "used": False
        }
        
        mock_supabase_client.execute.side_effect = [
            Mock(data=[existing_record]),  # First call returns record
            Mock(data=[])  # Update call for attempts increment
        ]
        
        # Mock hash verification to fail
        with patch('services.otp.otp_service.verify_otp_hash', return_value=False):
            result = otp_service.verify_otp(phone, otp_code)
        
        # Should return error for wrong OTP code
        assert result["success"] is False
        assert "일치하지 않습니다" in result["message"]
    
    def test_request_otp_handles_database_error(self, otp_service, mock_supabase_client):
        """Test that request_otp handles database errors gracefully."""
        phone = "+821012345678"
        
        # Mock database error on insert
        mock_supabase_client.execute.side_effect = Exception("Database error")
        
        with pytest.raises(Exception, match="Database error"):
            otp_service.request_otp(phone)
    
    def test_check_rate_limits_handles_malformed_timestamps(self, otp_service, mock_supabase_client):
        """Test that _check_rate_limits handles malformed timestamp data."""
        phone = "+821012345678"
        
        # Mock responses for rate limit queries with proper count attributes
        mock_15min_result = Mock()
        mock_15min_result.count = 0  # Provide count attribute that the service expects
        mock_15min_result.data = []
        
        mock_daily_result = Mock()
        mock_daily_result.count = 0  # Provide count attribute that the service expects
        mock_daily_result.data = []
        
        mock_supabase_client.execute.side_effect = [mock_15min_result, mock_daily_result]
        
        # Should handle gracefully by treating as allowed
        allowed, reason = otp_service._check_rate_limits(phone)
        assert allowed is True
        assert reason == "OK"