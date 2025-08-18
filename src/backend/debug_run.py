"""Helper entrypoint to run FastAPI with debugpy attach support.

Usage inside container (backend service):
    python debug_run.py

Then attach using the "Backend: FastAPI (attach)" configuration.
"""
from __future__ import annotations
import os
import debugpy
import uvicorn

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
DEBUG_PORT = int(os.environ.get("DEBUG_PORT", "5678"))

if __name__ == "__main__":
    debugpy.listen(("0.0.0.0", DEBUG_PORT))
    print(f"[debug] debugpy listening on {DEBUG_PORT}; attach your debugger (set DEBUG_WAIT=1 to block).")
    if os.environ.get("DEBUG_WAIT", "0") == "1":
        debugpy.wait_for_client()
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
