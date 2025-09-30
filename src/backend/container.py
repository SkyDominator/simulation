"""Dependency injection container."""
from typing import Dict, Any, Callable, TypeVar, Type
import os

from interfaces import DatabaseClient, SMSClient, ConfigProvider

# Import implementations with fallbacks for testing
try:
    from implementations import (
        create_database_client, 
        create_sms_client, 
        create_config_provider
    )
    PROD_IMPLEMENTATIONS_AVAILABLE = True
except ImportError:
    PROD_IMPLEMENTATIONS_AVAILABLE = False

# Always try to import test implementations
try:
    from test_implementations import (
        TestDatabaseClient, 
        TestSMSClient, 
        TestConfigProvider
    )
    TEST_IMPLEMENTATIONS_AVAILABLE = True
except ImportError:
    TEST_IMPLEMENTATIONS_AVAILABLE = False

T = TypeVar('T')


class ServiceContainer:
    """Simple dependency injection container."""
    
    def __init__(self):
        self._services: Dict[Type, Any] = {}
        self._singletons: Dict[Type, Any] = {}
        self._factories: Dict[Type, Callable[[], Any]] = {}
        
        # Register default factories
        self._setup_defaults()
    
    def _setup_defaults(self):
        """Setup default service factories."""
        # Determine if we're in test mode
        test_mode_env = os.environ.get("TEST_MODE", "").strip().lower()
        is_test_mode = test_mode_env in {"1", "true", "yes", "on"} or not PROD_IMPLEMENTATIONS_AVAILABLE
        
        if is_test_mode and TEST_IMPLEMENTATIONS_AVAILABLE:
            # Use test implementations
            self.register_singleton(ConfigProvider, TestConfigProvider)
            self.register_factory(DatabaseClient, TestDatabaseClient)
            self.register_factory(SMSClient, lambda: TestSMSClient(success=True))
        elif PROD_IMPLEMENTATIONS_AVAILABLE:
            # Use production implementations
            self.register_singleton(ConfigProvider, create_config_provider)
            self.register_factory(DatabaseClient, lambda: create_database_client(self.get(ConfigProvider)))
            self.register_factory(SMSClient, create_sms_client)
        else:
            # No implementations available - this will cause errors when trying to get services
            pass
        
        # Register services (import here to avoid circular imports)
        try:
            from services.simulations import SimulationService
            from services.otp.otp_service import OTPService
            
            self.register_factory(
                SimulationService, 
                lambda: SimulationService(self.get(DatabaseClient))
            )
            self.register_factory(
                OTPService,
                lambda: OTPService(
                    self.get(DatabaseClient),
                    self.get(SMSClient), 
                    self.get(ConfigProvider)
                )
            )
        except ImportError:
            # Services not available (e.g., in partial test environments)
            pass
    
    def register_singleton(self, interface: Type[T], factory: Callable[[], T]):
        """Register a singleton service."""
        self._factories[interface] = factory
        # Mark as singleton by adding to singletons dict (even if None for now)
        if interface not in self._singletons:
            self._singletons[interface] = None
    
    def register_factory(self, interface: Type[T], factory: Callable[[], T]):
        """Register a factory for creating instances."""
        self._factories[interface] = factory
    
    def register_instance(self, interface: Type[T], instance: T):
        """Register a specific instance (useful for testing)."""
        self._services[interface] = instance
    
    def get(self, interface: Type[T]) -> T:
        """Get a service instance."""
        # First check for registered instances (e.g., test mocks)
        if interface in self._services:
            return self._services[interface]
        
        # Check for singletons
        if interface in self._singletons:
            if self._singletons[interface] is None:
                self._singletons[interface] = self._factories[interface]()
            return self._singletons[interface]
        
        # Create new instance from factory
        if interface in self._factories:
            return self._factories[interface]()
        
        raise ValueError(f"No factory registered for {interface}")
    
    def reset(self):
        """Reset singletons (useful for testing)."""
        for key in self._singletons:
            self._singletons[key] = None
        self._services.clear()


# Global container instance
container = ServiceContainer()


def get_service(interface: Type[T]) -> T:
    """Convenience function to get a service."""
    return container.get(interface)