=================================================== test session starts ====================================================
platform linux -- Python 3.12.3, pytest-8.4.2, pluggy-1.6.0 -- /usr/bin/python
cachedir: .pytest_cache
rootdir: /home/runner/work/simulation/simulation/src/backend
configfile: pytest.ini
plugins: asyncio-1.2.0, anyio-4.9.0, cov-7.0.0, Faker-37.8.0, mock-3.15.1
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 15 items                                                                                                    

tests/unit/auth/test_jwt.py::TestJWTAuthentication::test_JWT_001_missing_kid_raises_unauthorized FAILED [  6%]
tests/unit/auth/test_jwt.py::TestJWTAuthentication::test_JWT_002_duplicated_kid_raises_error FAILED [ 13%]
tests/unit/services/test_simulation.py::TestSimulationService::test_connection_failure FAILED [ 20%]
tests/unit/config/test_settings.py::TestConfigurationValidation::test_missing_env_vars FAILED [ 26%]

======================================================== FAILURES ========================================================
____ TestJWTAuthentication.test_JWT_001_missing_kid_raises_unauthorized ____

self = <test_jwt.TestJWTAuthentication object at 0x000001952A789D0>
jwks_keys = {'keys': [{'alg': 'RS256', 'e': 'AQAB', 'kid': 'test-key-id-1', 'kty': 'RSA', ...}]}

    def test_JWT_001_missing_kid_raises_unauthorized(self, jwks_keys):
        """JWT-001: Missing kid -> Unauthorized (simulate header lacking 'kid')."""
        # Create token without kid in header
        token = self._create_test_token_header(header={"alg": "RS256", "typ": "JWT"})  # No kid
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
 
        with patch('auth.jwt.jwt.get_unverified_header') as mock_header:
            mock_header.return_value = {"alg": "RS256", "typ": "JWT"}  # No kid
 
            with pytest.raises(HTTPException) as exc_info:
                authenticate_jwt_token(credentials)
 
            assert exc_info.value.status_code == 401
>           assert "Missing 'kid' in JWT header" in str(exc_info.value.detail)
E           assert "Missing 'kid' in JWT header" in 'Could not validate credentials'
E             + where 'Could not validate credentials' = str('Could not validate credentials')

tests/unit/auth/test_jwt.py:124: AssertionError

____ TestJWTAuthentication.test_JWT_002_duplicated_kid_raises_error ____

self = <test_jwt.TestJWTAuthentication object at 0x000001952A789D0>
jwks_keys = {'keys': [{'alg': 'RS256', 'e': 'AQAB', 'kid': 'duplicate-id', 'kty': 'RSA', ...}]}

    def test_JWT_002_duplicated_kid_raises_error(self, jwks_keys):
        """JWT-002: Duplicate kid in JWKS should raise error."""
        # Modify jwks to have duplicate kids
        duplicate_jwks = {
            "keys": [
                {"alg": "RS256", "kid": "duplicate-id", "kty": "RSA", "e": "AQAB", "n": "test1"},
                {"alg": "RS256", "kid": "duplicate-id", "kty": "RSA", "e": "AQAB", "n": "test2"}
            ]
        }
        
        with patch('auth.jwt.get_jwks_keys', return_value=duplicate_jwks):
            token = self._create_test_token(kid="duplicate-id")
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            
            with pytest.raises(ValueError) as exc_info:
                authenticate_jwt_token(credentials)
            
>           assert "Duplicate kid found" in str(exc_info.value)
E           assert "Duplicate kid found" in 'Authentication failed'
E             + where 'Authentication failed' = str(ValueError('Authentication failed'))

tests/unit/auth/test_jwt.py:89: AssertionError

____ TestSimulationService.test_connection_failure ____

self = <test_simulation.TestSimulationService object at 0x000001952B7839D0>

    def test_connection_failure(self):
        """Test handling of database connection failure."""
        with patch('services.simulations.get_supabase_client') as mock_client:
            mock_client.side_effect = Exception("supabase_url is required")
            
            with pytest.raises(Exception) as exc_info:
>               SimulationService()
E               supabase._sync.client.SupabaseException: supabase_url is required

tests/unit/services/test_simulation.py:45: SupabaseException

____ TestConfigurationValidation.test_missing_env_vars ____

self = <test_settings.TestConfigurationValidation object at 0x000001952B783450>

    def test_missing_env_vars(self):
        """Test behavior when required environment variables are missing."""
        with patch.dict(os.environ, {}, clear=True):
            settings = Settings()
>           assert settings.supabase_url == ""
E           ModuleNotFoundError: No module named 'config_validator'

tests/unit/config/test_settings.py:23: ModuleNotFoundError

=============================================== short test summary info ================================================
FAILED tests/unit/auth/test_jwt.py::TestJWTAuthentication::test_JWT_001_missing_kid_raises_unauthorized - AssertionError: assert "Missing 'kid' in JWT header" in 'Could not validate credentials'
FAILED tests/unit/auth/test_jwt.py::TestJWTAuthentication::test_JWT_002_duplicated_kid_raises_error - AssertionError: assert "Duplicate kid found" in 'Authentication failed'  
FAILED tests/unit/services/test_simulation.py::TestSimulationService::test_connection_failure - SupabaseException: supabase_url is required
FAILED tests/unit/config/test_settings.py::TestConfigurationValidation::test_missing_env_vars - ModuleNotFoundError: No module named 'config_validator'
=================================================== 4 failed in 2.05s ===================================================