"""Test implementations for dependency injection during testing."""
from typing import Dict, Any, List, Optional
from interfaces import DatabaseClient, TableClient, QueryBuilder, QueryResult, SMSClient, ConfigProvider


class TestDatabaseClient(DatabaseClient):
    """Test implementation of DatabaseClient."""
    
    def __init__(self):
        self.data = {}
        
    def table(self, name: str) -> TableClient:
        return TestTableClient(self, name)


class TestTableClient(TableClient):
    """Test implementation of TableClient."""
    
    def __init__(self, db_client, table_name):
        self.db_client = db_client
        self.table_name = table_name
        
    def select(self, columns="*", count=None):
        return TestQueryBuilder(self, "select", {"columns": columns, "count": count})
    
    def insert(self, data):
        return TestQueryBuilder(self, "insert", {"data": data})
    
    def update(self, data):
        return TestQueryBuilder(self, "update", {"data": data})
    
    def delete(self):
        return TestQueryBuilder(self, "delete", {})


class TestQueryBuilder(QueryBuilder):
    """Test implementation of QueryBuilder."""
    
    def __init__(self, table_client, operation, params):
        self.table_client = table_client
        self.operation = operation
        self.params = params
        self.filters = {}
    
    def eq(self, column, value):
        self.filters[column] = value
        return self
    
    def gte(self, column, value):
        self.filters[f"{column}_gte"] = value
        return self
    
    def execute(self):
        table_name = self.table_client.table_name
        db = self.table_client.db_client
        
        if self.operation == "select":
            data = db.data.get(table_name, [])
            # Apply filters
            filtered_data = []
            for item in data:
                match = True
                for key, value in self.filters.items():
                    if key.endswith("_gte"):
                        actual_key = key[:-4]
                        if actual_key in item and item[actual_key] < value:
                            match = False
                            break
                    elif key in item and item[key] != value:
                        match = False
                        break
                if match:
                    filtered_data.append(item)
            
            return TestQueryResult(filtered_data, len(filtered_data))
        
        elif self.operation == "insert":
            if table_name not in db.data:
                db.data[table_name] = []
            new_item = self.params["data"].copy()
            new_item["id"] = f"test-id-{len(db.data[table_name])}"
            db.data[table_name].append(new_item)
            return TestQueryResult([new_item])
        
        elif self.operation == "update":
            data = db.data.get(table_name, [])
            updated_items = []
            for item in data:
                match = True
                for key, value in self.filters.items():
                    if key in item and item[key] != value:
                        match = False
                        break
                if match:
                    item.update(self.params["data"])
                    updated_items.append(item)
            return TestQueryResult(updated_items)
        
        elif self.operation == "delete":
            data = db.data.get(table_name, [])
            remaining_items = []
            for item in data:
                match = True
                for key, value in self.filters.items():
                    if key in item and item[key] != value:
                        match = False
                        break
                if not match:  # Keep items that don't match filters
                    remaining_items.append(item)
            db.data[table_name] = remaining_items
            return TestQueryResult([])
        
        return TestQueryResult([])


class TestQueryResult(QueryResult):
    """Test implementation of QueryResult."""
    
    def __init__(self, data, count=None):
        self._data = data
        self._count = count if count is not None else len(data)
    
    @property
    def data(self) -> List[Dict[str, Any]]:
        return self._data
    
    @property 
    def count(self) -> Optional[int]:
        return self._count


class TestSMSClient(SMSClient):
    """Test implementation of SMSClient."""
    
    def __init__(self, success=True):
        self.success = success
        self.sent_messages = []
    
    def send(self, phone: str, message: str) -> bool:
        self.sent_messages.append({"phone": phone, "message": message})
        return self.success


class TestConfigProvider(ConfigProvider):
    """Test implementation of ConfigProvider."""
    
    def __init__(self):
        self.config = {
            "otp_validity_minutes": 5,
            "otp_max_verification_attempts": 6,
            "otp_resend_limit_per_15min": 3,
            "otp_resend_limit_per_day": 10,
            "otp_secret_key": "test-secret-key",
            "supabase_url": "https://test.supabase.co",
            "supabase_key": "test-key"
        }
    
    def get(self, key, default=None):
        return self.config.get(key, default)
    
    def get_supabase_url(self):
        return self.config["supabase_url"]
    
    def get_supabase_key(self):
        return self.config["supabase_key"]
    
    def get_otp_secret_key(self):
        return self.config["otp_secret_key"]
    
    def get_otp_validity_minutes(self):
        return self.config["otp_validity_minutes"]
    
    def get_otp_max_verification_attempts(self):
        return self.config["otp_max_verification_attempts"]
    
    def get_otp_resend_limit_per_15min(self):
        return self.config["otp_resend_limit_per_15min"]
    
    def get_otp_resend_limit_per_day(self):
        return self.config["otp_resend_limit_per_day"]