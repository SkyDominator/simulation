=== PYTEST OUTPUT ===
============================= test session starts ==============================
platform linux -- Python 3.12.3, pytest-8.4.2, pluggy-1.6.0 -- /usr/bin/python
cachedir: .pytest_cache
rootdir: /home/runner/work/simulation/simulation/src/backend
configfile: pytest.ini
plugins: asyncio-1.2.0, anyio-4.9.0, cov-7.0.0, Faker-37.8.0, mock-3.15.1
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 219 items / 1 error

==================================== ERRORS ====================================
______________________ ERROR collecting tests/integration ______________________
/usr/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
<frozen importlib._bootstrap>:1387: in _gcd_import
    ???
<frozen importlib._bootstrap>:1360: in _find_and_load
    ???
<frozen importlib._bootstrap>:1331: in _find_and_load_unlocked
    ???
<frozen importlib._bootstrap>:935: in _load_unlocked
    ???
/home/runner/.local/lib/python3.12/site-packages/_pytest/assertion/rewrite.py:186: in exec_module
    exec(co, module.__dict__)
tests/integration/conftest.py:12: in <module>
    from main import app
main.py:7: in <module>
    from api.routes import router as api_router
api/routes.py:53: in <module>
    _sim_service = SimulationService()
                   ^^^^^^^^^^^^^^^^^^^
services/simulations.py:56: in __init__
    self.client = client or get_supabase_client()
                            ^^^^^^^^^^^^^^^^^^^^^
services/simulations.py:34: in get_supabase_client
    return create_client(settings.supabase_url, key)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/home/runner/.local/lib/python3.12/site-packages/supabase/_sync/client.py:369: in create_client
    return SyncClient.create(
/home/runner/.local/lib/python3.12/site-packages/supabase/_sync/client.py:101: in create
    client = cls(supabase_url, supabase_key, options)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
/home/runner/.local/lib/python3.12/site-packages/supabase/_sync/client.py:53: in __init__
    raise SupabaseException("supabase_url is required")
E   supabase._sync.client.SupabaseException: supabase_url is required
=============================== warnings summary ===============================
test_code_reviewer.py:30
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:30: PytestCollectionWarning: cannot collect test class 'TestFailure' because it has a __init__ constructor (from: test_code_reviewer.py)
    @dataclass

test_code_reviewer.py:40
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:40: PytestCollectionWarning: cannot collect test class 'TestIssue' because it has a __init__ constructor (from: test_code_reviewer.py)
    @dataclass

test_code_reviewer.py:49
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:49: PytestCollectionWarning: cannot collect test class 'TestResultParser' because it has a __init__ constructor (from: test_code_reviewer.py)
    class TestResultParser:

test_code_reviewer.py:318
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:318: PytestCollectionWarning: cannot collect test class 'TestCodeFixer' because it has a __init__ constructor (from: test_code_reviewer.py)
    class TestCodeFixer:

test_code_reviewer.py:474
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:474: PytestCollectionWarning: cannot collect test class 'TestCodeReviewer' because it has a __init__ constructor (from: test_code_reviewer.py)
    class TestCodeReviewer:

test_code_reviewer.py:474
  /home/runner/work/simulation/simulation/src/backend/test_code_reviewer.py:474: PytestCollectionWarning: cannot collect test class 'TestCodeReviewer' because it has a __init__ constructor (from: test_code_reviewer_cli.py)
    class TestCodeReviewer:

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================== short test summary info ============================
ERROR tests/integration - supabase._sync.client.SupabaseException: supabase_url is required
!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!
========================= 6 warnings, 1 error in 1.16s =========================
