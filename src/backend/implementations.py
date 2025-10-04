"""Concrete implementations of interfaces."""
from typing import Dict, Any, List, Optional

try:
    from supabase import Client, create_client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = Any

try:
    from services.otp.solapi_sms import SolapiSMSClient
    SOLAPI_AVAILABLE = True
except ImportError:
    SOLAPI_AVAILABLE = False
    SolapiSMSClient = Any

from interfaces import DatabaseClient, TableClient, QueryBuilder, QueryResult, SMSClient, ConfigProvider

try:
    from config.settings import settings
    SETTINGS_AVAILABLE = True
except ImportError:
    SETTINGS_AVAILABLE = False
    settings = None


class SupabaseTableClient(TableClient):
    """Supabase implementation of TableClient."""
    
    def __init__(self, supabase_table):
        self._table = supabase_table
    
    def select(self, columns: str = "*") -> QueryBuilder:
        return SupabaseQueryBuilder(self._table.select(columns))
    
    def insert(self, data: Dict[str, Any]) -> QueryBuilder:
        return SupabaseQueryBuilder(self._table.insert(data))
    
    def update(self, data: Dict[str, Any]) -> QueryBuilder:
        return SupabaseQueryBuilder(self._table.update(data))
    
    def delete(self) -> QueryBuilder:
        return SupabaseQueryBuilder(self._table.delete())


class SupabaseQueryBuilder(QueryBuilder):
    """Supabase implementation of QueryBuilder."""
    
    def __init__(self, query):
        self._query = query
    
    def eq(self, column: str, value: Any) -> QueryBuilder:
        return SupabaseQueryBuilder(self._query.eq(column, value))
    
    def gte(self, column: str, value: Any) -> QueryBuilder:
        return SupabaseQueryBuilder(self._query.gte(column, value))
    
    def gt(self, column: str, value: Any) -> QueryBuilder:
        return SupabaseQueryBuilder(self._query.gt(column, value))
    
    def execute(self) -> QueryResult:
        result = self._query.execute()
        return SupabaseQueryResult(result)


class SupabaseQueryResult(QueryResult):
    """Supabase implementation of QueryResult."""
    
    def __init__(self, result):
        self._result = result
    
    @property
    def data(self) -> List[Dict[str, Any]]:
        return self._result.data or []
    
    @property 
    def count(self) -> Optional[int]:
        return getattr(self._result, 'count', None)


class SupabaseDatabaseClient(DatabaseClient):
    """Supabase implementation of DatabaseClient."""
    
    def __init__(self, client: Client):
        self._client = client
    
    def table(self, name: str) -> TableClient:
        return SupabaseTableClient(self._client.table(name))


class SolapiSMSClientAdapter(SMSClient):
    """Adapter for SolapiSMSClient to implement SMSClient interface."""
    
    def __init__(self):
        if not SOLAPI_AVAILABLE:
            raise ImportError("Solapi SMS client not available")
        self._client = SolapiSMSClient()
    
    def send(self, phone: str, message: str) -> bool:
        try:
            result = self._client.send_sms(phone, message)
            return result.get("success", False)
        except Exception:
            return False
    
    def send_otp(self, phone: str, otp_code: str) -> Dict[str, Any]:
        try:
            result = self._client.send_otp(phone, otp_code)
            return result
        except Exception:
            return {"success": False, "error": "Failed to send OTP"}


class SettingsConfigProvider(ConfigProvider):
    """Settings-based implementation of ConfigProvider."""
    
    def __init__(self):
        if not SETTINGS_AVAILABLE:
            raise ImportError("Settings not available")
    
    def get(self, key: str, default: Any = None) -> Any:
        return getattr(settings, key, default)
    
    def get_supabase_url(self) -> str:
        return settings.supabase_url
    
    def get_supabase_key(self) -> str:
        return settings.supabase_secret_key or settings.supabase_publishable_key
    
    def get_otp_secret_key(self) -> str:
        return settings.otp_secret_key
    
    def get_otp_validity_minutes(self) -> int:
        return settings.otp_validity_minutes
    
    def get_otp_max_verification_attempts(self) -> int:
        return settings.otp_max_verification_attempts
    
    def get_otp_resend_limit_per_15min(self) -> int:
        return settings.otp_resend_limit_per_15min
    
    def get_otp_resend_limit_per_day(self) -> int:
        return settings.otp_resend_limit_per_day


def create_database_client(config: ConfigProvider) -> DatabaseClient:
    """Factory function to create database client."""
    if not SUPABASE_AVAILABLE:
        raise ImportError("Supabase client not available")
    supabase_client = create_client(config.get_supabase_url(), config.get_supabase_key())
    return SupabaseDatabaseClient(supabase_client)


def create_sms_client() -> SMSClient:
    """Factory function to create SMS client."""
    return SolapiSMSClientAdapter()


def create_config_provider() -> ConfigProvider:
    """Factory function to create config provider."""
    return SettingsConfigProvider()