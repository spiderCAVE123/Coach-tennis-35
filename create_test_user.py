"""
Create a test user and session directly in MongoDB for testing purposes
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def create_test_user():
    """Create a test user and session for testing"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Test user data
    test_user = {
        "user_id": "test_user_123",
        "email": "testuser@tennis.com",
        "name": "Test Tennis Player",
        "picture": "https://example.com/avatar.jpg",
        "xp": 0,
        "level": 1,
        "premium": False,
        "streak_days": 0,
        "last_activity": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc)
    }
    
    # Test session
    test_session = {
        "session_token": "test_session_token_12345",
        "user_id": "test_user_123",
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    try:
        # Delete existing test user and session
        await db.users.delete_many({"email": "testuser@tennis.com"})
        await db.user_sessions.delete_many({"user_id": "test_user_123"})
        
        # Insert test user
        await db.users.insert_one(test_user)
        print(f"✅ Created test user: {test_user['email']}")
        
        # Insert test session
        await db.user_sessions.insert_one(test_session)
        print(f"✅ Created test session: {test_session['session_token']}")
        
        print("\nTest credentials:")
        print(f"User ID: {test_user['user_id']}")
        print(f"Session Token: {test_session['session_token']}")
        print(f"Use this token in Authorization header: Bearer {test_session['session_token']}")
        
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
