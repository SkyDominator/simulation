"""Abstract interfaces for dependency injection."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class DatabaseClient(ABC):
    """Interface for database operations."""
    
    @abstractmethod
    def table(self, name: str) -> "TableClient":
        """Get a table client for the specified table."""
        pass


class TableClient(ABC):
    """Interface for table-level database operations."""
    
    @abstractmethod
    def select(self, columns: str = "*") -> "QueryBuilder":
        """Select columns from the table."""
        pass
    
    @abstractmethod
    def insert(self, data: Dict[str, Any]) -> "QueryBuilder":
        """Insert data into the table."""
        pass
    
    @abstractmethod
    def update(self, data: Dict[str, Any]) -> "QueryBuilder":
        """Update table data."""
        pass
    
    @abstractmethod
    def delete(self) -> "QueryBuilder":
        """Delete from the table."""
        pass


class QueryBuilder(ABC):
    """Interface for query building and execution."""
    
    @abstractmethod
    def eq(self, column: str, value: Any) -> "QueryBuilder":
        """Add equality filter."""
        pass
    
    @abstractmethod
    def gte(self, column: str, value: Any) -> "QueryBuilder":
        """Add greater than or equal filter."""
        pass
    
    @abstractmethod
    def gt(self, column: str, value: Any) -> "QueryBuilder":
        """Add greater than filter."""
        pass
    
    @abstractmethod
    def execute(self) -> "QueryResult":
        """Execute the query."""
        pass


class QueryResult(ABC):
    """Interface for query results."""
    
    @property
    @abstractmethod
    def data(self) -> List[Dict[str, Any]]:
        """Get the result data."""
        pass
    
    @property
    @abstractmethod
    def count(self) -> Optional[int]:
        """Get the result count."""
        pass


class SMSClient(ABC):
    """Interface for SMS operations."""
    
    @abstractmethod
    def send(self, phone: str, message: str) -> bool:
        """Send SMS message to phone number."""
        pass
    
    @abstractmethod
    def send_otp(self, phone: str, otp_code: str) -> Dict[str, Any]:
        """Send OTP message to phone number."""
        pass


class ConfigProvider(ABC):
    """Interface for configuration management."""
    
    @abstractmethod
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        pass
    
    @abstractmethod
    def get_supabase_url(self) -> str:
        """Get Supabase URL."""
        pass
    
    @abstractmethod
    def get_supabase_key(self) -> str:
        """Get Supabase key (secret or publishable)."""
        pass
    
    @abstractmethod
    def get_otp_secret_key(self) -> str:
        """Get OTP secret key."""
        pass
    
    @abstractmethod
    def get_otp_validity_minutes(self) -> int:
        """Get OTP validity in minutes."""
        pass
    
    @abstractmethod
    def get_otp_max_verification_attempts(self) -> int:
        """Get maximum OTP verification attempts."""
        pass
    
    @abstractmethod
    def get_otp_resend_limit_per_15min(self) -> int:
        """Get OTP resend limit per 15 minutes."""
        pass
    
    @abstractmethod
    def get_otp_resend_limit_per_day(self) -> int:
        """Get OTP resend limit per day."""
        pass