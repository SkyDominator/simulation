# src/backend/services/otp/nhn_cloud_sms.py
import logging
import requests
import time
import hmac
import hashlib
import base64
from typing import Dict, Any, Optional
from datetime import datetime
from config.settings import settings

logger = logging.getLogger(__name__)

class NHNCloudSMSClient:
    """
    Client for sending SMS using NHN Cloud (TOAST) SMS API.
    Documentation: https://docs.toast.com/en/Notification/SMS/en/api-guide/
    """
    def __init__(self):
        self.app_key = settings.nhn_cloud_appkey
        self.secret_key = settings.nhn_cloud_secret_key
        self.sender_number = settings.nhn_cloud_sender_number
        self.api_base_url = "https://api-sms.cloud.toast.com"
        self.api_version = "v3.0"
        
    def _generate_signature(self, timestamp: str) -> str:
        """Generate signature for NHN Cloud API authentication."""
        message = f"{self.app_key}:{timestamp}"
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        return base64.b64encode(signature).decode('utf-8')
    
    def send_sms(self, recipient: str, message: str) -> Dict[str, Any]:
        """
        Send SMS to a recipient using NHN Cloud SMS API.
        
        Args:
            recipient: Target phone number (E.164 format recommended)
            message: The message content
            
        Returns:
            Dictionary with results including success flag and provider message ID
        """
        # Remove any '+' prefix from the phone number
        recipient_clean = recipient.lstrip('+')
        
        # Current timestamp for signature
        timestamp = str(int(time.time() * 1000))
        signature = self._generate_signature(timestamp)
        
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": self.secret_key,
            "X-TC-APP-KEY": self.app_key,
            "X-TC-TIMESTAMP": timestamp,
            "X-TC-SIGNATURE": signature
        }
        
        payload = {
            "body": message,
            "sendNo": self.sender_number,
            "recipientList": [{"internationalRecipientNo": recipient_clean}]
        }
        
        endpoint = f"{self.api_base_url}/sms/{self.api_version}/appKeys/{self.app_key}/sender/sms"
        
        try:
            response = requests.post(
                endpoint, 
                headers=headers, 
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Check for API-level success
            if result.get("header", {}).get("isSuccessful", False):
                msg_id = result.get("body", {}).get("data", {}).get("requestId")
                return {
                    "success": True,
                    "provider_msg_id": msg_id,
                    "response": result
                }
            else:
                error = result.get("header", {}).get("resultMessage", "Unknown error")
                logger.error(f"NHN Cloud SMS API error: {error}")
                return {
                    "success": False,
                    "error": error,
                    "response": result
                }
                
        except requests.RequestException as e:
            logger.error(f"NHN Cloud SMS request failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def send_otp(self, recipient: str, otp_code: str) -> Dict[str, Any]:
        """Convenience method to send an OTP message."""
        message = f"[파트너스 클럽] 인증번호: {otp_code}. 타인에게 공유하지 마세요."
        return self.send_sms(recipient, message)