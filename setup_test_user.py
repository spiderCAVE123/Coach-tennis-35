#!/usr/bin/env python3
"""
Setup test user and session in MongoDB for backend testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

async def setup_test_user():
    """Create test user and session in MongoDB"""
    print("Setting up test user in MongoDB...")
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test user data
        test_user = {
            "user_id": "test_user_123",
            "email": "testuser@tennisai.com",
            "name": "Test Tennis Player",
            "picture": "https://example.com/avatar.jpg",
            "xp": 0,
            "level": 1,
            "premium": False,
            "streak_days": 0,
            "last_activity": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Test session data
        test_session = {
            "session_token": "test_session_token_12345",
            "user_id": "test_user_123",
            "expires_at": datetime(2030, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        
        # Delete existing test user and session
        await db.users.delete_many({"user_id": "test_user_123"})
        await db.user_sessions.delete_many({"user_id": "test_user_123"})
        
        # Insert test user
        await db.users.insert_one(test_user)
        print(f"✓ Created test user: {test_user['user_id']}")
        
        # Insert test session
        await db.user_sessions.insert_one(test_session)
        print(f"✓ Created test session: {test_session['session_token']}")
        
        print("\nTest user setup complete!")
        print(f"User ID: {test_user['user_id']}")
        print(f"Session Token: {test_session['session_token']}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"✗ Error setting up test user: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(setup_test_user())
