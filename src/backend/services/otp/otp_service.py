# src/backend/services/otp/otp_service.py
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

from services.otp.utils import generate_otp, hash_otp, verify_otp_hash, normalize_phone, calculate_expiry
from interfaces import DatabaseClient, SMSClient, ConfigProvider

logger = logging.getLogger(__name__)

class OTPService:
    def __init__(self, db_client: DatabaseClient, sms_client: SMSClient, config: ConfigProvider):
        """Initialize OTP service with injected dependencies."""
        self.db_client = db_client
        self.sms_client = sms_client
        self.config = config
    
    def _check_rate_limits(self, phone: str, client_ip: Optional[str] = None) -> Tuple[bool, str]:
        """
        Check rate limits for OTP generation.
        
        Returns:
            Tuple of (allowed: bool, reason: str)
        """
        now = datetime.now()
        fifteen_min_ago = now - timedelta(minutes=15)
        day_ago = now - timedelta(hours=24)
        
        # Check 15-minute limit
        fifteen_min_result = self.db_client.table("phone_otps") \
            .select("id") \
            .eq("phone", phone) \
            .gte("created_at", fifteen_min_ago.isoformat()) \
            .execute()
            
        fifteen_min_count = len(fifteen_min_result.data) if fifteen_min_result.data else 0
        if fifteen_min_count >= self.config.get_otp_resend_limit_per_15min():
            return False, f"Maximum OTP requests reached. Try again in a few minutes."
        
        # Check daily limit
        day_result = self.db_client.table("phone_otps") \
            .select("id") \
            .eq("phone", phone) \
            .gte("created_at", day_ago.isoformat()) \
            .execute()
            
        day_count = len(day_result.data) if day_result.data else 0
        if day_count >= self.config.get_otp_resend_limit_per_day():
            return False, f"Daily OTP limit reached. Try again tomorrow."
        
        # IP-based rate limiting could be added here
        
        return True, "OK"
    
    def request_otp(self, phone: str, client_ip: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate and send an OTP to the provided phone number.
        
        Args:
            phone: The phone number to send OTP to
            client_ip: Client IP for rate limiting
            user_agent: Client user agent for troubleshooting
            
        Returns:
            Dict with success flag and message
        """
        normalized_phone = phone
        
        # Check rate limits
        allowed, reason = self._check_rate_limits(normalized_phone, client_ip)
        if not allowed:
            return {
                "success": False,
                "message": reason
            }
        
        # Generate 6-digit OTP
        otp_code = generate_otp(6)
        
        # Create hash of OTP
        otp_hash = hash_otp(normalized_phone, otp_code)
        
        # Invalidate any existing unused OTPs for this phone
        self.db_client.table("phone_otps") \
            .update({"used": True}) \
            .eq("phone", normalized_phone) \
            .eq("used", False) \
            .execute()
            
        # Store new OTP hash
        expires_at = calculate_expiry()
        insert_data = {
            "phone": normalized_phone,
            "code_hash": otp_hash,
            "expires_at": expires_at.isoformat(),
            "client_ip": client_ip,
            "user_agent": user_agent
        }
        
        # Insert into database
        db_response = self.db_client.table("phone_otps").insert(insert_data).execute()
        
        if not db_response.data:
            logger.error("Failed to save OTP record to database")
            return {
                "success": False,
                "message": "Internal server error"
            }
        
        # Send SMS with OTP
        sms_result = self.sms_client.send_otp(normalized_phone, otp_code)
        
        # Update the record with provider message ID if available
        if sms_result.get("success") and sms_result.get("provider_msg_id"):
            self.db_client.table("phone_otps") \
                .update({"provider_msg_id": sms_result.get("provider_msg_id")}) \
                .eq("id", db_response.data[0]["id"]) \
                .execute()
                
        logger.info(f"OTP sent to {normalized_phone}")
        
        return {
            "success": sms_result.get("success", False),
            "message": "인증번호가 발송되었습니다." if sms_result.get("success") else "인증번호 발송에 실패했습니다.",
            "expires_in_seconds": self.config.get_otp_validity_minutes() * 60
        }
    
    def verify_otp(self, phone: str, otp_code: str, client_ip: Optional[str] = None) -> Dict[str, Any]:
        """
        Verify OTP code for a phone number.
        
        Args:
            phone: Phone number
            otp_code: OTP code to verify
            client_ip: Client IP for logging
            
        Returns:
            Dict with verification results
        """
        normalized_phone = phone.replace(" ", "").replace("-", "")
        
        # Get the latest unused OTP for this phone that hasn't expired
        now = datetime.now().isoformat()
        
        otp_records = self.db_client.table("phone_otps") \
            .select("*") \
            .eq("phone", normalized_phone) \
            .eq("used", False) \
            .gt("expires_at", now) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
            
        if not otp_records.data or len(otp_records.data) == 0:
            return {
                "success": False,
                "message": "유효하지 않거나 만료된 인증번호입니다."
            }
            
        otp_record = otp_records.data[0]
        
        # Check attempts
        if otp_record["attempts"] >= self.config.get_otp_max_verification_attempts():
            # Mark as used/expired since max attempts reached
            self.db_client.table("phone_otps") \
                .update({"used": True}) \
                .eq("id", otp_record["id"]) \
                .execute()
                
            return {
                "success": False,
                "message": "인증 시도 횟수를 초과했습니다. 새 인증번호를 요청하세요."
            }
        
        # Verify OTP
        if verify_otp_hash(normalized_phone, otp_code, otp_record["code_hash"]):
            # Mark OTP as used
            self.db_client.table("phone_otps") \
                .update({"used": True}) \
                .eq("id", otp_record["id"]) \
                .execute()
                
            return {
                "success": True,
                "message": "인증에 성공했습니다.",
            }
        else:
            # Increment attempts counter
            new_attempts = otp_record["attempts"] + 1
            
            self.db_client.table("phone_otps") \
                .update({"attempts": new_attempts}) \
                .eq("id", otp_record["id"]) \
                .execute()
                
            remaining_attempts = self.config.get_otp_max_verification_attempts() - new_attempts
                
            return {
                "success": False,
                "message": f"인증번호가 일치하지 않습니다. {remaining_attempts}회 시도 기회가 남았습니다." if remaining_attempts > 0 else "인증 시도 횟수를 초과했습니다. 새 인증번호를 요청하세요.",
                "remaining_attempts": remaining_attempts if remaining_attempts > 0 else 0
            }