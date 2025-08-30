#!/usr/bin/env python
"""
Test script for verifying Solapi SMS integration.
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load environment variables from .env file
load_dotenv()

from services.otp.solapi_sms import SolapiSMSClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_solapi_sms():
    """Test sending an SMS using the Solapi client."""
    client = SolapiSMSClient()
    
    # Replace with a valid phone number for testing
    recipient = input("Enter a phone number to test (e.g., 01012345678): ")
    
    result = client.send_sms(recipient, "[테스트] 솔라피 SMS 통합 테스트 메시지입니다.")
    
    if result["success"]:
        logger.info(f"Success! Message ID: {result.get('provider_msg_id')}")
    else:
        logger.error(f"Failed to send SMS: {result.get('error')}")
        logger.debug(f"Full response: {result.get('response')}")

if __name__ == "__main__":
    logger.info("Testing Solapi SMS integration...")
    test_solapi_sms()
