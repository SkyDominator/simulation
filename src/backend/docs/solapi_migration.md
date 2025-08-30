# Migration from NHN Cloud SMS to Solapi

This document outlines the steps required to migrate the SMS service from NHN Cloud to Solapi.

## 1. Environment Variables

Update your environment variables with Solapi credentials:

```bash
# Add these to your .env file or deployment environment
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
SOLAPI_SENDER_NUMBER=your_sender_number
```

## 2. Install the Solapi Python Package

The Solapi Python package has been added to requirements.txt. Run:

```bash
pip install -r requirements.txt
```

Or install it directly:

```bash
pip install solapi==5.1.0
```

## 3. Testing the New SMS Service

To verify the Solapi integration is working correctly:

1. Ensure you have the proper Solapi credentials set in your environment variables.
2. Try sending a test OTP code via the API.

## 4. Troubleshooting

If you encounter issues with the Solapi integration:

- Verify your API credentials are correct
- Check the application logs for detailed error messages
- Ensure the sender number is registered with Solapi
- If needed, you can temporarily revert to NHN Cloud by modifying the import in `otp_service.py`

## 5. Solapi Resources

- [Solapi Documentation](https://docs.solapi.com/)
- [Solapi Python GitHub](https://github.com/solapi/solapi-python)
- [API References](https://docs.solapi.com/api-reference/overview)
