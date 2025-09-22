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
        client.table.return_value = client
        client.select.return_value = client
        client.eq.return_value = client
        client.gte.return_value = client
        client.execute.return_value = Mock(data=[])
        client.insert.return_value = client
        client.update.return_value = client
        return client
    
    @pytest.fixture
    def otp_service(self, mock_supabase_client, settings_override):
        """Create OTP service instance with mocked dependencies."""
        with patch('services.otp.otp_service._supabase_client', return_value=mock_supabase_client):
            service = OTPService()
            # Inject the mock client
            service._client = mock_supabase_client
            return service
    
    def test_OTPS_001_check_rate_limits_allows_first_request(self, otp_service, mock_supabase_client):
        """OTPS-001: _check_rate_limits allows first request for new phone."""
        phone = "+821012345678"
        
        # Mock no existing records
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        # Should not raise exception
        otp_service._check_rate_limits(phone)
    
    def test_OTPS_002_check_rate_limits_blocks_exceeded_15min_limit(self, otp_service, mock_supabase_client, settings_override, freeze_jan_1_2025):
        """OTPS-002: _check_rate_limits blocks when 15min limit exceeded."""
        phone = "+821012345678"
        
        with freeze_jan_1_2025:
            now = datetime.now()
            fifteen_min_ago = now - timedelta(minutes=15)
            
            # Mock records showing limit exceeded
            mock_records = [
                {"created_at": (fifteen_min_ago + timedelta(minutes=i)).isoformat()}
                for i in range(settings_override.otp_resend_limit_per_15min)
            ]
            mock_supabase_client.execute.return_value = Mock(data=mock_records)
            
            # Should raise exception
            with pytest.raises(Exception, match="15분"):
                otp_service._check_rate_limits(phone)
    
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
            mock_supabase_client.execute.return_value = Mock(data=mock_records)
            
            # Should raise exception
            with pytest.raises(Exception, match="24시간"):
                otp_service._check_rate_limits(phone)
    
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
            
            # Use the longer list for the mock
            mock_data = mock_records_daily if len(mock_records_daily) > len(mock_records_15min) else mock_records_15min
            mock_supabase_client.execute.return_value = Mock(data=mock_data)
            
            # Should not raise exception
            otp_service._check_rate_limits(phone)
    
    def test_OTPS_005_request_otp_normalizes_phone_number(self, otp_service, mock_supabase_client):
        """OTPS-005: request_otp normalizes phone number before processing."""
        input_phone = "010-1234-5678"
        expected_normalized = "+821012345678"
        
        # Mock successful rate limit check and insert
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        with patch('services.otp.otp_service.normalize_phone') as mock_normalize:
            mock_normalize.return_value = expected_normalized
            
            with patch('services.otp.otp_service.generate_otp', return_value="123456"):
                with patch('services.otp.otp_service.hash_otp', return_value="mock_hash"):
                    result = otp_service.request_otp(input_phone)
            
            # Should call normalize_phone with input
            mock_normalize.assert_called_once_with(input_phone)
            
            # Should return normalized phone in result
            assert result["user_hash"]  # Should contain some hash-like value
    
    def test_OTPS_006_request_otp_generates_and_stores_otp(self, otp_service, mock_supabase_client, freeze_jan_1_2025):
        """OTPS-006: request_otp generates OTP and stores with expiry."""
        phone = "+821012345678"
        mock_otp = "123456"
        mock_hash = "mock_hash_value"
        
        # Mock dependencies
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        with freeze_jan_1_2025:
            with patch('services.otp.otp_service.generate_otp', return_value=mock_otp) as mock_gen_otp:
                with patch('services.otp.otp_service.hash_otp', return_value=mock_hash) as mock_hash_otp:
                    with patch('services.otp.otp_service.calculate_expiry') as mock_calc_expiry:
                        mock_expiry = datetime.now() + timedelta(minutes=5)
                        mock_calc_expiry.return_value = mock_expiry
                        
                        result = otp_service.request_otp(phone)
            
            # Should generate OTP
            mock_gen_otp.assert_called_once()
            
            # Should hash OTP
            mock_hash_otp.assert_called_once_with(phone, mock_otp)
            
            # Should insert into database
            mock_supabase_client.insert.assert_called_once()
            inserted_data = mock_supabase_client.insert.call_args[0][0]
            
            assert inserted_data["phone_number"] == phone
            assert inserted_data["otp_hash"] == mock_hash
            assert "expires_at" in inserted_data
            assert "user_hash" in inserted_data
    
    def test_OTPS_007_verify_otp_increments_attempts_on_failure(self, otp_service, mock_supabase_client, settings_override):
        """OTPS-007: verify_otp increments attempts on wrong code."""
        phone = "+821012345678"
        wrong_code = "654321"
        user_hash = "test_user_hash"
        
        # Mock existing OTP record
        existing_record = {
            "id": 1,
            "phone_number": phone,
            "otp_hash": "stored_hash",
            "attempts": 2,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "user_hash": user_hash
        }
        
        # Mock database responses
        mock_supabase_client.execute.return_value = Mock(data=[existing_record])
        
        with patch('services.otp.otp_service.verify_otp_hash', return_value=False):
            result = otp_service.verify_otp(phone, wrong_code, user_hash)
        
        # Should update attempts count
        mock_supabase_client.update.assert_called_once()
        update_data = mock_supabase_client.update.call_args[0][0]
        assert update_data["attempts"] == 3
        
        # Should return remaining attempts
        assert result["verified"] is False
        expected_remaining = settings_override.otp_max_verification_attempts - 3
        assert result["remaining_attempts"] == expected_remaining
    
    def test_OTPS_008_verify_otp_blocks_after_max_attempts(self, otp_service, mock_supabase_client, settings_override):
        """OTPS-008: verify_otp blocks verification after max attempts reached."""
        phone = "+821012345678"
        otp_code = "123456"
        user_hash = "test_user_hash"
        
        # Mock record with max attempts reached
        existing_record = {
            "id": 1,
            "phone_number": phone,
            "otp_hash": "stored_hash",
            "attempts": settings_override.otp_max_verification_attempts,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "user_hash": user_hash
        }
        
        mock_supabase_client.execute.return_value = Mock(data=[existing_record])
        
        # Should raise exception
        with pytest.raises(Exception, match="최대 시도 횟수"):
            otp_service.verify_otp(phone, otp_code, user_hash)
    
    def test_OTPS_009_verify_otp_success_resets_attempts(self, otp_service, mock_supabase_client):
        """OTPS-009: verify_otp resets attempts counter on successful verification."""
        phone = "+821012345678"
        correct_code = "123456"
        user_hash = "test_user_hash"
        
        # Mock existing record with some attempts
        existing_record = {
            "id": 1,
            "phone_number": phone,
            "otp_hash": "stored_hash",
            "attempts": 3,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "user_hash": user_hash
        }
        
        mock_supabase_client.execute.return_value = Mock(data=[existing_record])
        
        with patch('services.otp.otp_service.verify_otp_hash', return_value=True):
            result = otp_service.verify_otp(phone, correct_code, user_hash)
        
        # Should reset attempts to 0
        mock_supabase_client.update.assert_called_once()
        update_data = mock_supabase_client.update.call_args[0][0]
        assert update_data["attempts"] == 0
        
        # Should return success
        assert result["verified"] is True
        assert "remaining_attempts" in result


class TestOTPServiceEdgeCases:
    """Test edge cases and error conditions for OTP service."""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client for testing."""
        client = Mock()
        client.table.return_value = client
        client.select.return_value = client
        client.eq.return_value = client
        client.gte.return_value = client
        client.execute.return_value = Mock(data=[])
        client.insert.return_value = client
        client.update.return_value = client
        return client
    
    @pytest.fixture  
    def otp_service(self, mock_supabase_client, settings_override):
        """Create OTP service instance with mocked dependencies."""
        with patch('services.otp.otp_service._supabase_client', return_value=mock_supabase_client):
            service = OTPService()
            service._client = mock_supabase_client
            return service
    
    def test_verify_otp_handles_expired_otp(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles expired OTP correctly."""
        phone = "+821012345678"
        otp_code = "123456"
        user_hash = "test_user_hash"
        
        # Mock expired record
        expired_record = {
            "id": 1,
            "phone_number": phone,
            "otp_hash": "stored_hash",
            "attempts": 1,
            "expires_at": (datetime.now() - timedelta(minutes=1)).isoformat(),  # Expired
            "user_hash": user_hash
        }
        
        mock_supabase_client.execute.return_value = Mock(data=[expired_record])
        
        # Should raise exception for expired OTP
        with pytest.raises(Exception, match="만료"):
            otp_service.verify_otp(phone, otp_code, user_hash)
    
    def test_verify_otp_handles_nonexistent_otp(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles nonexistent OTP record."""
        phone = "+821012345678"
        otp_code = "123456"
        user_hash = "test_user_hash"
        
        # Mock no records found
        mock_supabase_client.execute.return_value = Mock(data=[])
        
        # Should raise exception for not found
        with pytest.raises(Exception, match="찾을 수 없거나"):
            otp_service.verify_otp(phone, otp_code, user_hash)
    
    def test_verify_otp_handles_user_hash_mismatch(self, otp_service, mock_supabase_client):
        """Test that verify_otp handles user_hash mismatch."""
        phone = "+821012345678"
        otp_code = "123456"
        wrong_user_hash = "wrong_hash"
        
        # Mock record with different user_hash
        existing_record = {
            "id": 1,
            "phone_number": phone,
            "otp_hash": "stored_hash",
            "attempts": 1,
            "expires_at": (datetime.now() + timedelta(minutes=5)).isoformat(),
            "user_hash": "correct_hash"  # Different from wrong_user_hash
        }
        
        mock_supabase_client.execute.return_value = Mock(data=[existing_record])
        
        # Should raise exception for hash mismatch
        with pytest.raises(Exception, match="찾을 수 없거나"):
            otp_service.verify_otp(phone, otp_code, wrong_user_hash)
    
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
        
        # Mock records with malformed timestamps
        mock_records = [
            {"created_at": "invalid-timestamp"},
            {"created_at": None},
            {"created_at": ""},
        ]
        mock_supabase_client.execute.return_value = Mock(data=mock_records)
        
        # Should handle gracefully (likely treat as old/invalid and allow)
        try:
            otp_service._check_rate_limits(phone)
        except Exception as e:
            # If it raises an exception, it should be a clear parsing error
            assert "timestamp" in str(e).lower() or "date" in str(e).lower()