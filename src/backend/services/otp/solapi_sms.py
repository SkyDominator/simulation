# src/backend/services/otp/solapi_sms.py
import logging
import json
from typing import Dict, Any
from config.settings import settings
from solapi import message

logger = logging.getLogger(__name__)

class SolapiSMSClient:
    """
    Client for sending SMS using Solapi API.
    Documentation: https://docs.solapi.com/api-reference/overview
    GitHub: https://github.com/solapi/solapi-python
    """
    def __init__(self):
        # The solapi library reads API_KEY and API_SECRET from environment variables
        # or you can pass them directly to the functions
        self.api_key = settings.solapi_api_key
        self.api_secret = settings.solapi_api_secret
        self.sender_number = settings.solapi_sender_number
        
    def send_sms(self, recipient: str, message_text: str) -> Dict[str, Any]:
        """
        Send SMS to a recipient using Solapi API.
        
        Args:
            recipient: Target phone number
            message_text: The message content
            
        Returns:
            Dictionary with results including success flag and provider message ID
        """
        try:
            # Format the recipient number (ensure no '+' prefix)
            recipient_clean = recipient.lstrip('+')
            
            # Prepare the message payload
            params = {
                'to': recipient_clean,
                'from': self.sender_number,
                'text': message_text
            }
            
            # Send the message using the Solapi library
            # If API_KEY and API_SECRET are set in env vars, they're used automatically
            # Otherwise pass them explicitly
            response = message.send_one(params, self.api_key, self.api_secret)
            
            # Check if the message was sent successfully
            if response.get('statusCode') == '2000':  # Success code from Solapi
                return {
                    "success": True,
                    "provider_msg_id": response.get("messageId"),
                    "response": response
                }
            else:
                error = f"{response.get('statusCode')}: {response.get('statusMessage', 'Unknown error')}"
                logger.error(f"Solapi SMS API error: {error}")
                return {
                    "success": False,
                    "error": error,
                    "response": response
                }
                
        except Exception as e:
            logger.error(f"Solapi SMS request failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def send_otp(self, recipient: str, otp_code: str) -> Dict[str, Any]:
        """Convenience method to send an OTP message."""
        message_text = f"생명빛 클럽 OTP: {otp_code}. 타인에게 공유하지 마세요."
        return self.send_sms(recipient, message_text)
