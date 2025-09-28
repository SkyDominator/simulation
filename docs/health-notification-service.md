# Health Notification Service

The Health Notification Service monitors the application's status and sends notifications to developers when the health status changes. This system helps ensure quick awareness of issues like service outages, slowdowns, or recoveries.

## Overview

The service consists of three main components:

1. **HealthMonitor**: Monitors the `/api/health` endpoint and detects status changes
2. **NotificationProviders**: Multiple notification delivery methods (iOS Push, KakaoTalk, Telegram, Log)
3. **HealthNotificationService**: Orchestrates monitoring and sends notifications only when status changes

## Health Status Types

- **OK**: Application is running normally
- **DEGRADED**: Application is running but with issues (slow response, HTTP errors)
- **UNAVAILABLE**: Application is not accessible (connection failed, timeout)

## Notification Providers

### Priority Order
1. **iOS Push Notification** (best option for mobile developers)
2. **KakaoTalk Message** (popular in Korea)
3. **Telegram Bot** (easy to set up, reliable)
4. **Log Fallback** (always available for testing)

### iOS Push Notifications

```bash
# Environment variables for iOS Push notifications
IOS_APNS_KEY_ID=ABC123DEF4
IOS_TEAM_ID=TEAM123456
IOS_BUNDLE_ID=com.example.simulation
IOS_APNS_KEY_PATH=/path/to/AuthKey_ABC123DEF4.p8
IOS_DEVICE_TOKEN=abc123def456...
IOS_USE_SANDBOX=false
```

**Note**: iOS Push implementation is currently a placeholder. For production use, you'll need to:
1. Generate an APNs authentication key from Apple Developer Console
2. Implement proper JWT signing for APNs HTTP/2 API
3. Handle device token registration and management

### KakaoTalk Messages

```bash
# Environment variables for KakaoTalk notifications
KAKAO_APP_KEY=your_app_key
KAKAO_RECIPIENT_ID=recipient_uuid
```

**Note**: KakaoTalk implementation is currently a placeholder. For production use, you'll need to:
1. Register a KakaoTalk for Developers app
2. Implement the KakaoTalk API authentication flow
3. Set up message templates and recipient management

### Telegram Bot (Recommended for Easy Setup)

```bash
# Environment variables for Telegram notifications
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
```

**Setup Instructions**:
1. Create a Telegram bot by messaging [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions to get your bot token
3. Get your chat ID by messaging your bot and visiting `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Set the environment variables and restart the service

## Configuration

### Basic Setup

Enable health monitoring by setting:

```bash
HEALTH_MONITORING_ENABLED=true
```

### Advanced Configuration

```bash
# Health check settings
HEALTH_CHECK_INTERVAL=60.0          # Check every 60 seconds
HEALTH_CHECK_TIMEOUT=10.0           # Request timeout in seconds  
HEALTH_SLOW_THRESHOLD_MS=3000.0     # Consider slow if > 3 seconds

# Configure at least one notification provider
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## API Endpoints

All health notification management endpoints require admin privileges.

### Get Service Status

```bash
GET /api/admin/health-notifications/status
Authorization: Bearer <admin_jwt_token>
```

Response:
```json
{
  "is_running": true,
  "check_interval": 60.0,
  "health_url": "https://simulation.lightoflifeclub.com/api/health",
  "last_status": "ok",
  "last_check_time": "2024-01-20T12:00:00Z",
  "notification_providers": ["TelegramNotificationProvider"],
  "provider_count": 1,
  "success": true
}
```

### Start/Stop Monitoring

```bash
POST /api/admin/health-notifications/control
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "action": "start"  # or "stop"
}
```

Response:
```json
{
  "action": "start",
  "success": true,
  "message": "Health monitoring started successfully"
}
```

### Send Test Notification

```bash
POST /api/admin/health-notifications/test
Authorization: Bearer <admin_jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "Test notification sent (status changed)",
  "status": "ok",
  "latency_ms": 150.5,
  "error": null
}
```

## Deployment

### Development

```bash
# Set minimum configuration
export HEALTH_MONITORING_ENABLED=true
export TELEGRAM_BOT_TOKEN=your_bot_token
export TELEGRAM_CHAT_ID=your_chat_id

# Start backend
cd src/backend
uvicorn main:app --reload
```

### Production

1. **Environment Variables**: Set all required environment variables in your deployment environment
2. **Automatic Startup**: The service automatically starts when `HEALTH_MONITORING_ENABLED=true`
3. **Background Process**: Runs as a background task within the FastAPI application
4. **Logging**: All notifications and errors are logged for monitoring

### Docker Deployment

Add environment variables to your `docker-compose.yml` or container configuration:

```yaml
services:
  backend:
    environment:
      - HEALTH_MONITORING_ENABLED=true
      - TELEGRAM_BOT_TOKEN=your_bot_token
      - TELEGRAM_CHAT_ID=your_chat_id
      - HEALTH_CHECK_INTERVAL=60.0
```

## Example Notifications

### Telegram Message Format

```
🚨 Life Light Club Simulation Status

Status: UNAVAILABLE
Time: 2024-01-20 12:00:00 UTC
Error: Connection refused

URL: https://simulation.lightoflifeclub.com
```

### Log Format

```
WARNING:services.health.notification_providers:🚨 HEALTH NOTIFICATION: UNAVAILABLE - Error: Connection refused
```

## Troubleshooting

### Service Not Starting

1. Check if `HEALTH_MONITORING_ENABLED=true` is set
2. Verify at least one notification provider is configured
3. Check application logs for initialization errors

### Notifications Not Sending

1. Test notification provider credentials manually
2. Check network connectivity from the server
3. Verify chat IDs and tokens are correct
4. Use the test endpoint to debug specific issues

### Too Many Notifications

The service only sends notifications when status changes (not on every check), but if you're getting too many:

1. Increase `HEALTH_CHECK_INTERVAL` (default: 60 seconds)
2. Adjust `HEALTH_SLOW_THRESHOLD_MS` if slow responses trigger too many alerts

### Log Monitoring

Monitor these log patterns:
- `Health status changed:` - Status change detected
- `Notification sent successfully` - Successful delivery
- `Failed to send notification` - Delivery failure
- `Health monitoring started/stopped` - Service lifecycle

## Security Considerations

1. **Admin-Only Access**: All management endpoints require admin JWT tokens
2. **Secret Management**: Store notification credentials securely (environment variables, secrets management)
3. **Rate Limiting**: The service has built-in status change detection to prevent spam
4. **Network Access**: Ensure outbound HTTPS access for notification providers

## Future Enhancements

1. **Full iOS Push Implementation**: Complete APNs HTTP/2 integration
2. **Full KakaoTalk Integration**: Implement KakaoTalk API with proper authentication
3. **Multiple Recipients**: Support for notification groups/teams
4. **Escalation Rules**: Send to different channels based on severity/duration
5. **Dashboard Integration**: Web UI for managing notification settings
6. **Metrics Integration**: Integration with monitoring systems (Prometheus, Grafana)
7. **SMS Fallback**: SMS notifications as ultimate fallback method