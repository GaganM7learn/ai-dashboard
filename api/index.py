"""api/index.py - Vercel Serverless Function Entry Point for FastAPI Backend.
Exposes the ASGI `app` object so that all requests to /api/* are served by dashboard_api.
"""

from __future__ import annotations

import sys
import os

# Add root project directory to sys.path so dashboard_api, solution, features are discoverable
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from dashboard_api import app

# Export app for Vercel's Python runtime
__all__ = ["app"]
