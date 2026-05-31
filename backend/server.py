from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Get EMERGENT_LLM_KEY
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# Auth Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    xp: int = 0
    level: int = 1
    premium: bool = False
    streak_days: int = 0
    last_activity: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_token: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionData(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

# Video Upload Models
class VideoUpload(BaseModel):
    video_id: str
    user_id: str
    shot_type: str  # serve, forehand, backhand, volley
    video_data: str  # base64 encoded video
    analyzed: bool = False
    analysis_result: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VideoAnalysisRequest(BaseModel):
    video_id: str

class VideoAnalysisResult(BaseModel):
    technique_score: int
    footwork_feedback: str
    swing_timing: str
    contact_point: str
    balance_rating: int
    suggested_fixes: List[str]
    pro_comparison: str

# Training Plan Models
class TrainingPlan(BaseModel):
    plan_id: str
    user_id: str
    goal: str
    skill_level: str
    weakness: str
    daily_drills: List[Dict[str, Any]]
    weekly_schedule: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TrainingPlanRequest(BaseModel):
    goal: str
    skill_level: str
    weakness: str

# Progress Models
class ProgressUpdate(BaseModel):
    user_id: str
    video_id: str
    score: int
    shot_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Achievement Models
class Achievement(BaseModel):
    achievement_id: str
    user_id: str
    badge_name: str
    description: str
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Chat Models
class ChatMessage(BaseModel):
    message: str

class ChatHistory(BaseModel):
    chat_id: str
    user_id: str
    messages: List[Dict[str, str]]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Challenge Models
class Challenge(BaseModel):
    challenge_id: str
    user_id: str
    challenge_type: str
    description: str
    progress: int = 0
    target: int = 0
    completed: bool = False
    reward_xp: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPER ====================

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from session token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "")
        
        # Find session
        session = await db.user_sessions.find_one(
            {"session_token": token},
            {"_id": 0}
        )
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        # Check expiration (normalize to timezone-aware)
        expires_at = session.get('expires_at')
        if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < datetime.now(timezone.utc):
            await db.user_sessions.delete_one({"session_token": token})
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Get user
        user = await db.users.find_one(
            {"user_id": session['user_id']},
            {"_id": 0}
        )
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def health_check():
    """Health check endpoint"""
    return "Hello World"

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(session_data: SessionData):
    """Create or update user session after Google auth"""
    try:
        # Verify session with Emergent
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_data.session_token}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
        
        # Upsert user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        existing_user = await db.users.find_one({"email": session_data.email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user['user_id']
            # Update last activity
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"last_activity": datetime.now(timezone.utc)}}
            )
        else:
            # Create new user
            new_user = User(
                user_id=user_id,
                email=session_data.email,
                name=session_data.name,
                picture=session_data.picture,
                last_activity=datetime.now(timezone.utc)
            )
            await db.users.insert_one(new_user.dict())
        
        # Create session
        user_session = UserSession(
            session_token=session_data.session_token,
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        await db.user_sessions.delete_many({"user_id": user_id})  # Clear old sessions
        await db.user_sessions.insert_one(user_session.dict())
        
        return {"success": True, "user_id": user_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Get current user info"""
    user = await get_current_user(authorization)
    return user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    await db.user_sessions.delete_one({"session_token": token})
    
    return {"success": True}

# ==================== VIDEO ENDPOINTS ====================

@api_router.post("/videos/upload")
async def upload_video(
    shot_type: str = Form(...),
    video_base64: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    """Upload a tennis video for analysis"""
    user = await get_current_user(authorization)
    
    try:
        # Check upload limit for free users
        if not user.get('premium', False):
            # Count uploads this week
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            upload_count = await db.videos.count_documents({
                "user_id": user['user_id'],
                "created_at": {"$gte": week_ago}
            })
            
            if upload_count >= 3:
                raise HTTPException(
                    status_code=403, 
                    detail="Free tier limit reached. Upgrade to premium for unlimited uploads."
                )
        
        video_id = f"video_{uuid.uuid4().hex[:12]}"
        
        video = VideoUpload(
            video_id=video_id,
            user_id=user['user_id'],
            shot_type=shot_type,
            video_data=video_base64,
            analyzed=False
        )
        
        await db.videos.insert_one(video.dict())
        
        return {
            "success": True,
            "video_id": video_id,
            "message": "Video uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Video upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/videos/analyze")
async def analyze_video(
    request: VideoAnalysisRequest,
    authorization: Optional[str] = Header(None)
):
    """Analyze tennis video using AI (mocked analysis)"""
    user = await get_current_user(authorization)
    
    try:
        # Get video
        video = await db.videos.find_one(
            {"video_id": request.video_id, "user_id": user['user_id']},
            {"_id": 0}
        )
        
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Generate AI analysis using OpenAI
        shot_type = video['shot_type']
        
        # Create AI prompt for analysis
        prompt = f"""Analyze this tennis {shot_type} stroke and provide detailed feedback.
        
Generate realistic analysis feedback with:
1. A technique score (1-100)
2. Footwork feedback (2-3 sentences)
3. Swing timing analysis (2-3 sentences)
4. Contact point feedback (2-3 sentences)
5. Balance rating (1-10)
6. 3-5 suggested fixes
7. Comparison to professional {shot_type} technique

Be encouraging but constructive. Format the response as JSON with these exact keys:
technique_score, footwork_feedback, swing_timing, contact_point, balance_rating, suggested_fixes (array), pro_comparison"""

        # Use OpenAI to generate realistic analysis
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis_{request.video_id}",
            system_message="You are a professional tennis coach analyzing technique. Provide detailed, actionable feedback."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        import json
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            analysis_data = json.loads(response_text)
        except:
            # Fallback to mock data if parsing fails
            analysis_data = {
                "technique_score": 78,
                "footwork_feedback": "Good positioning but work on split-step timing.",
                "swing_timing": "Nice rhythm, slightly early contact on some shots.",
                "contact_point": "Contact point is solid, aim for more consistency.",
                "balance_rating": 8,
                "suggested_fixes": [
                    "Focus on split-step before opponent hits",
                    "Rotate shoulders more for power",
                    "Follow through completely"
                ],
                "pro_comparison": f"Your {shot_type} shows similar characteristics to professional players."
            }
        
        # Update video with analysis
        await db.videos.update_one(
            {"video_id": request.video_id},
            {
                "$set": {
                    "analyzed": True,
                    "analysis_result": analysis_data
                }
            }
        )
        
        # Add progress tracking
        progress = ProgressUpdate(
            user_id=user['user_id'],
            video_id=request.video_id,
            score=analysis_data['technique_score'],
            shot_type=shot_type
        )
        await db.progress.insert_one(progress.dict())
        
        # Award XP
        xp_reward = 50
        await db.users.update_one(
            {"user_id": user['user_id']},
            {"$inc": {"xp": xp_reward}}
        )
        
        # Check for new level
        updated_user = await db.users.find_one({"user_id": user['user_id']}, {"_id": 0})
        new_level = (updated_user['xp'] // 500) + 1
        if new_level > updated_user['level']:
            await db.users.update_one(
                {"user_id": user['user_id']},
                {"$set": {"level": new_level}}
            )
        
        return {
            "success": True,
            "analysis": analysis_data,
            "xp_earned": xp_reward
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Video analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/videos/list")
async def list_videos(authorization: Optional[str] = Header(None)):
    """Get user's video upload history"""
    user = await get_current_user(authorization)
    
    videos = await db.videos.find(
        {"user_id": user['user_id']},
        {"_id": 0, "video_data": 0}  # Exclude large video data
    ).sort("created_at", -1).to_list(100)
    
    return {"videos": videos}

# ==================== TRAINING PLAN ENDPOINTS ====================

@api_router.post("/training/generate")
async def generate_training_plan(
    request: TrainingPlanRequest,
    authorization: Optional[str] = Header(None)
):
    """Generate personalized training plan using AI"""
    user = await get_current_user(authorization)
    
    try:
        # Use AI to generate training plan
        prompt = f"""Create a personalized tennis training plan for a player with:
- Skill Level: {request.skill_level}
- Goal: {request.goal}
- Main Weakness: {request.weakness}

Generate a comprehensive plan with:
1. 7 daily drills (each with name, description, reps, duration)
2. A weekly schedule (7 days with focus areas)
3. Estimated improvement timeline

Format as JSON with keys: daily_drills (array), weekly_schedule (array), improvement_timeline (string)"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"training_{user['user_id']}",
            system_message="You are a professional tennis coach creating personalized training plans."
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        import json
        try:
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            plan_data = json.loads(response_text)
        except:
            # Fallback mock data
            plan_data = {
                "daily_drills": [
                    {"name": "Shadow Swings", "description": "Practice motion without ball", "reps": 50, "duration": "10 min"},
                    {"name": "Wall Rally", "description": "Hit against wall", "reps": 100, "duration": "15 min"}
                ],
                "weekly_schedule": [
                    {"day": "Monday", "focus": "Forehand technique"},
                    {"day": "Tuesday", "focus": "Footwork drills"}
                ],
                "improvement_timeline": "4-6 weeks with consistent practice"
            }
        
        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        
        training_plan = TrainingPlan(
            plan_id=plan_id,
            user_id=user['user_id'],
            goal=request.goal,
            skill_level=request.skill_level,
            weakness=request.weakness,
            daily_drills=plan_data.get('daily_drills', []),
            weekly_schedule=plan_data.get('weekly_schedule', [])
        )
        
        await db.training_plans.insert_one(training_plan.dict())
        
        return {
            "success": True,
            "plan": training_plan.dict()
        }
        
    except Exception as e:
        logging.error(f"Training plan generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/training/plans")
async def get_training_plans(authorization: Optional[str] = Header(None)):
    """Get user's training plans"""
    user = await get_current_user(authorization)
    
    plans = await db.training_plans.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"plans": plans}

# ==================== PROGRESS ENDPOINTS ====================

@api_router.get("/progress/stats")
async def get_progress_stats(authorization: Optional[str] = Header(None)):
    """Get user progress statistics"""
    user = await get_current_user(authorization)
    
    # Get all progress data
    progress_data = await db.progress.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    # Get achievements
    achievements = await db.achievements.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate stats by shot type
    shot_types = ["serve", "forehand", "backhand", "volley"]
    stats_by_shot = {}
    
    for shot_type in shot_types:
        shot_data = [p for p in progress_data if p['shot_type'] == shot_type]
        if shot_data:
            scores = [p['score'] for p in shot_data]
            stats_by_shot[shot_type] = {
                "average_score": sum(scores) / len(scores),
                "best_score": max(scores),
                "total_attempts": len(scores),
                "improvement": scores[-1] - scores[0] if len(scores) > 1 else 0
            }
        else:
            stats_by_shot[shot_type] = {
                "average_score": 0,
                "best_score": 0,
                "total_attempts": 0,
                "improvement": 0
            }
    
    return {
        "user": {
            "name": user['name'],
            "xp": user['xp'],
            "level": user['level'],
            "streak_days": user.get('streak_days', 0)
        },
        "stats_by_shot": stats_by_shot,
        "achievements": achievements,
        "progress_history": progress_data
    }

# ==================== AI COACH CHAT ENDPOINTS ====================

@api_router.post("/coach/chat")
async def chat_with_coach(
    message: ChatMessage,
    authorization: Optional[str] = Header(None)
):
    """Chat with AI tennis coach"""
    user = await get_current_user(authorization)
    
    try:
        # Get chat history
        chat_history = await db.chat_history.find_one(
            {"user_id": user['user_id']},
            {"_id": 0}
        )
        
        if not chat_history:
            chat_id = f"chat_{uuid.uuid4().hex[:12]}"
            chat_history = {
                "chat_id": chat_id,
                "user_id": user['user_id'],
                "messages": []
            }
        
        # Create AI chat
        system_msg = """You are Coach Alex, a friendly and expert tennis coach. 
        You provide encouragement, technical advice, strategy tips, and motivation.
        Keep responses concise but helpful. Be enthusiastic and supportive."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_history.get('chat_id', f"chat_{user['user_id']}"),
            system_message=system_msg
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=message.message)
        response = await chat.send_message(user_message)
        
        # Update chat history
        chat_history['messages'].append({
            "role": "user",
            "content": message.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        chat_history['messages'].append({
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Save to database
        await db.chat_history.update_one(
            {"user_id": user['user_id']},
            {"$set": chat_history},
            upsert=True
        )
        
        return {
            "success": True,
            "response": response
        }
        
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/coach/history")
async def get_chat_history(authorization: Optional[str] = Header(None)):
    """Get chat history with AI coach"""
    user = await get_current_user(authorization)
    
    chat_history = await db.chat_history.find_one(
        {"user_id": user['user_id']},
        {"_id": 0}
    )
    
    if not chat_history:
        return {"messages": []}
    
    return {"messages": chat_history.get('messages', [])}

# ==================== GAMIFICATION ENDPOINTS ====================

@api_router.get("/gamification/leaderboard")
async def get_leaderboard(authorization: Optional[str] = Header(None)):
    """Get global leaderboard"""
    await get_current_user(authorization)
    
    # Get top users by XP
    top_users = await db.users.find(
        {},
        {"_id": 0, "name": 1, "xp": 1, "level": 1, "picture": 1}
    ).sort("xp", -1).limit(100).to_list(100)
    
    return {"leaderboard": top_users}

@api_router.get("/gamification/challenges")
async def get_challenges(authorization: Optional[str] = Header(None)):
    """Get daily challenges"""
    user = await get_current_user(authorization)
    
    # Get or create today's challenges
    today = datetime.now(timezone.utc).date()
    
    challenges = await db.challenges.find(
        {
            "user_id": user['user_id'],
            "created_at": {
                "$gte": datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
            }
        },
        {"_id": 0}
    ).to_list(100)
    
    # Create daily challenges if none exist
    if not challenges:
        daily_challenges = [
            {
                "challenge_id": f"challenge_{uuid.uuid4().hex[:8]}",
                "user_id": user['user_id'],
                "challenge_type": "daily",
                "description": "Upload and analyze 1 video",
                "progress": 0,
                "target": 1,
                "completed": False,
                "reward_xp": 100,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "challenge_id": f"challenge_{uuid.uuid4().hex[:8]}",
                "user_id": user['user_id'],
                "challenge_type": "daily",
                "description": "Score above 80 on any stroke",
                "progress": 0,
                "target": 1,
                "completed": False,
                "reward_xp": 150,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "challenge_id": f"challenge_{uuid.uuid4().hex[:8]}",
                "user_id": user['user_id'],
                "challenge_type": "daily",
                "description": "Chat with AI coach",
                "progress": 0,
                "target": 1,
                "completed": False,
                "reward_xp": 50,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.challenges.insert_many(daily_challenges)
        # Re-fetch from database to exclude _id
        challenges = await db.challenges.find(
            {
                "user_id": user['user_id'],
                "created_at": {
                    "$gte": datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
                }
            },
            {"_id": 0}
        ).to_list(100)
    
    return {"challenges": challenges}

# ==================== PREMIUM ENDPOINTS ====================

@api_router.get("/premium/status")
async def get_premium_status(authorization: Optional[str] = Header(None)):
    """Get user premium status"""
    user = await get_current_user(authorization)
    
    return {
        "is_premium": user.get('premium', False),
        "features": {
            "free": ["3 uploads per week", "Basic AI feedback", "Progress tracking"],
            "premium": [
                "Unlimited uploads",
                "Advanced analytics",
                "Personalized training plans",
                "AI coach with memory",
                "Priority support"
            ]
        }
    }

@api_router.post("/premium/upgrade")
async def upgrade_to_premium(authorization: Optional[str] = Header(None)):
    """Upgrade to premium (mock endpoint)"""
    user = await get_current_user(authorization)
    
    # In production, this would integrate with payment gateway
    await db.users.update_one(
        {"user_id": user['user_id']},
        {"$set": {"premium": True}}
    )
    
    return {
        "success": True,
        "message": "Upgraded to premium!"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create indexes on startup
@app.on_event("startup")
async def create_indexes():
    """Create MongoDB indexes"""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.videos.create_index("user_id")
        await db.videos.create_index("video_id", unique=True)
        await db.training_plans.create_index("user_id")
        await db.progress.create_index("user_id")
        await db.achievements.create_index("user_id")
        await db.chat_history.create_index("user_id", unique=True)
        await db.challenges.create_index("user_id")
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
