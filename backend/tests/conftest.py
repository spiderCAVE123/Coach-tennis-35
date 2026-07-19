"""Shared fixtures for backend tests."""
import os
import sys
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

# Load backend env for MongoDB access
BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

# Also load frontend env for backend URL
FRONTEND_ROOT = BACKEND_ROOT.parent / "frontend"
load_dotenv(FRONTEND_ROOT / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


@pytest.fixture(scope="session")
def base_url():
    assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not configured"
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="session")
def test_user(mongo_db):
    """Seed a test user + session directly in Mongo (bypasses Google OAuth)."""
    user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
    session_token = f"TEST_TOKEN_{uuid.uuid4().hex}"
    email = f"TEST_{uuid.uuid4().hex[:6]}@test.local"

    user_doc = {
        "user_id": user_id,
        "email": email,
        "name": "TEST User",
        "picture": "",
        "auth_method": "google",
        "xp": 0,
        "level": 1,
        "premium": True,  # Bypass free-tier upload limit during tests
        "streak_days": 0,
        "total_matches": 0,
        "total_practice_hours": 0.0,
        "achievements": [],
        "last_activity": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
    }

    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    }

    mongo_db.users.insert_one(user_doc)
    mongo_db.user_sessions.insert_one(session_doc)

    yield {"user_id": user_id, "session_token": session_token, "email": email}

    # Cleanup
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.videos.delete_many({"user_id": user_id})
    mongo_db.progress.delete_many({"user_id": user_id})
    mongo_db.achievements.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})


@pytest.fixture
def auth_headers(test_user):
    return {
        "Authorization": f"Bearer {test_user['session_token']}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
