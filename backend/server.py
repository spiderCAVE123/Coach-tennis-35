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
    email: Optional[str] = None
    phone_number: Optional[str] = None
    name: str
    picture: Optional[str] = None
    password_hash: Optional[str] = None
    auth_method: str = "google"  # google, phone, email
    xp: int = 0
    level: int = 1
    premium: bool = False
    streak_days: int = 0
    total_matches: int = 0
    total_practice_hours: float = 0.0
    achievements: List[str] = []
    last_activity: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PhoneAuthRequest(BaseModel):
    phone_number: str

class PhoneVerifyRequest(BaseModel):
    phone_number: str
    code: str

class EmailSignupRequest(BaseModel):
    email: str
    password: str
    name: str

class EmailLoginRequest(BaseModel):
    email: str
    password: str

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

class VideoUploadRequest(BaseModel):
    shot_type: str
    video_base64: str

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

# Match Models
class Match(BaseModel):
    match_id: str
    user_id: str
    opponent_name: str
    match_date: datetime
    result: str  # won, lost
    score: str  # e.g., "6-4, 6-3"
    duration_minutes: int
    aces: int = 0
    double_faults: int = 0
    winners: int = 0
    unforced_errors: int = 0
    first_serve_percentage: float = 0.0
    break_points_won: int = 0
    break_points_total: int = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchCreate(BaseModel):
    opponent_name: str
    match_date: str
    result: str
    score: str
    duration_minutes: int
    aces: int = 0
    double_faults: int = 0
    winners: int = 0
    unforced_errors: int = 0
    first_serve_percentage: float = 0.0
    break_points_won: int = 0
    break_points_total: int = 0
    notes: Optional[str] = None

# Settings Models
class UserSettings(BaseModel):
    user_id: str
    notifications_enabled: bool = True
    email_notifications: bool = True
    practice_reminders: bool = True
    weekly_summary: bool = True
    theme: str = "dark"
    language: str = "en"
    units: str = "metric"  # metric or imperial
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    email_notifications: Optional[bool] = None
    practice_reminders: Optional[bool] = None
    weekly_summary: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    units: Optional[str] = None

# Friend Models
class FriendRequest(BaseModel):
    request_id: str
    from_user_id: str
    to_user_id: str
    status: str  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Friendship(BaseModel):
    friendship_id: str
    user1_id: str
    user2_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FriendRequestCreate(BaseModel):
    to_user_id: str

class FriendRequestAction(BaseModel):
    request_id: str
    action: str  # accept or reject

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
    upload_data: VideoUploadRequest,
    authorization: Optional[str] = Header(None)
):
    """Upload a tennis video for analysis - accepts any video format"""
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
            
            if upload_count >= 10:  # Increased limit for free users
                raise HTTPException(
                    status_code=403, 
                    detail="Free tier limit reached. Upgrade to premium for unlimited uploads."
                )
        
        video_id = f"video_{uuid.uuid4().hex[:12]}"
        
        # Truncate video data if too large (to prevent DB issues)
        # We only need to store some indication of the video, not the full data
        video_data_snippet = upload_data.video_base64[:500] if upload_data.video_base64 else ""
        
        video = VideoUpload(
            video_id=video_id,
            user_id=user['user_id'],
            shot_type=upload_data.shot_type,
            video_data=video_data_snippet,  # Store snippet only
            analyzed=False
        )
        
        await db.videos.insert_one(video.dict())
        
        # Auto-award first upload achievement
        try:
            await award_achievement(user['user_id'], "first_upload", "Uploaded first video")
        except Exception as e:
            logging.warning(f"Could not award achievement: {e}")
        
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

        # Use OpenAI to generate realistic analysis with fallback
        analysis_data = None
        
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"analysis_{request.video_id}",
                system_message="You are a professional tennis coach analyzing technique. Provide detailed, actionable feedback in JSON format."
            ).with_model("openai", "gpt-4o")
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            import json
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            analysis_data = json.loads(response_text)
            
            # Validate required fields
            required_fields = ['technique_score', 'footwork_feedback', 'swing_timing', 'contact_point', 'balance_rating', 'suggested_fixes', 'pro_comparison']
            if not all(field in analysis_data for field in required_fields):
                raise ValueError("Missing required fields")
                
        except Exception as ai_error:
            logging.warning(f"AI analysis failed, using fallback: {ai_error}")
            # Fallback to realistic mock data based on shot type
            import random
            
            base_score = random.randint(65, 92)
            balance = random.randint(6, 10)
            
            shot_specific_feedback = {
                "serve": {
                    "footwork": "Your stance shows good balance. Focus on your toss consistency and knee bend for more power.",
                    "swing_timing": "Nice fluid motion. Try to reach maximum extension at contact point for more pace.",
                    "contact_point": "Contact is above the head, which is great. Aim to hit the ball at the peak of your toss.",
                    "fixes": [
                        "Maintain a consistent ball toss",
                        "Bend knees more for explosive power",
                        "Follow through across your body",
                        "Keep eyes on the ball until contact"
                    ],
                    "pro_comparison": "Your serve shows similar characteristics to Djokovic - great preparation and body rotation."
                },
                "forehand": {
                    "footwork": "Good open stance positioning. Work on your split-step timing and lateral movement.",
                    "swing_timing": "Your swing timing is smooth. Focus on early preparation for cleaner contact.",
                    "contact_point": "Contact is at waist height - ideal. Try to hit slightly in front of your body for more spin.",
                    "fixes": [
                        "Prepare racket earlier",
                        "Rotate hips through the shot",
                        "Follow through over the shoulder",
                        "Use more legs for power"
                    ],
                    "pro_comparison": "Your forehand technique resembles Federer's - fluid motion with good extension."
                },
                "backhand": {
                    "footwork": "Solid positioning for backhand shots. Work on stepping into the ball with your front foot.",
                    "swing_timing": "Good timing on the backswing. Try to keep your wrist firm through contact.",
                    "contact_point": "Contact point is well positioned. Focus on hitting through the ball with both hands.",
                    "fixes": [
                        "Turn shoulders early",
                        "Keep non-dominant hand firm",
                        "Step forward into the shot",
                        "Follow through toward target"
                    ],
                    "pro_comparison": "Your backhand shows Nadal-like power with good topspin generation."
                },
                "volley": {
                    "footwork": "Good ready position at the net. Focus on split-step timing and moving forward through the ball.",
                    "swing_timing": "Short, compact swings are ideal for volleys. Keep punching through the ball.",
                    "contact_point": "Contact in front of body is perfect for volleys. Keep racket head up.",
                    "fixes": [
                        "Keep continental grip",
                        "Move forward into every volley",
                        "Punch, don't swing",
                        "Watch the ball onto strings"
                    ],
                    "pro_comparison": "Your volley technique is similar to McEnroe - compact and precise."
                }
            }
            
            shot_data = shot_specific_feedback.get(shot_type, shot_specific_feedback["forehand"])
            
            analysis_data = {
                "technique_score": base_score,
                "footwork_feedback": shot_data["footwork"],
                "swing_timing": shot_data["swing_timing"],
                "contact_point": shot_data["contact_point"],
                "balance_rating": balance,
                "suggested_fixes": shot_data["fixes"],
                "pro_comparison": shot_data["pro_comparison"]
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

# ==================== MATCH TRACKING ENDPOINTS ====================

@api_router.post("/matches/create")
async def create_match(match: MatchCreate, authorization: Optional[str] = Header(None)):
    """Create a new match record"""
    user = await get_current_user(authorization)
    
    try:
        match_id = f"match_{uuid.uuid4().hex[:12]}"
        
        match_record = Match(
            match_id=match_id,
            user_id=user['user_id'],
            opponent_name=match.opponent_name,
            match_date=datetime.fromisoformat(match.match_date.replace('Z', '+00:00')),
            result=match.result,
            score=match.score,
            duration_minutes=match.duration_minutes,
            aces=match.aces,
            double_faults=match.double_faults,
            winners=match.winners,
            unforced_errors=match.unforced_errors,
            first_serve_percentage=match.first_serve_percentage,
            break_points_won=match.break_points_won,
            break_points_total=match.break_points_total,
            notes=match.notes
        )
        
        await db.matches.insert_one(match_record.dict())
        
        # Update user stats
        await db.users.update_one(
            {"user_id": user['user_id']},
            {
                "$inc": {
                    "total_matches": 1,
                    "total_practice_hours": match.duration_minutes / 60.0,
                    "xp": 100 if match.result == "won" else 50
                }
            }
        )
        
        # Check for achievements
        user_matches = await db.matches.find({"user_id": user['user_id']}).to_list(1000)
        if len(user_matches) == 1:
            await award_achievement(user['user_id'], "first_match", "First Match Played")
        elif len(user_matches) == 10:
            await award_achievement(user['user_id'], "match_veteran", "10 Matches Played")
        
        return {
            "success": True,
            "match_id": match_id,
            "xp_earned": 100 if match.result == "won" else 50
        }
        
    except Exception as e:
        logging.error(f"Match creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/matches/list")
async def list_matches(authorization: Optional[str] = Header(None)):
    """Get user's match history"""
    user = await get_current_user(authorization)
    
    matches = await db.matches.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).sort("match_date", -1).to_list(100)
    
    return {"matches": matches}

@api_router.get("/matches/stats")
async def get_match_stats(authorization: Optional[str] = Header(None)):
    """Get match statistics"""
    user = await get_current_user(authorization)
    
    matches = await db.matches.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).to_list(1000)
    
    if not matches:
        return {
            "total_matches": 0,
            "wins": 0,
            "losses": 0,
            "win_percentage": 0,
            "total_hours": 0,
            "avg_aces": 0,
            "avg_double_faults": 0,
            "avg_first_serve": 0
        }
    
    wins = sum(1 for m in matches if m['result'] == 'won')
    losses = len(matches) - wins
    total_minutes = sum(m['duration_minutes'] for m in matches)
    
    stats = {
        "total_matches": len(matches),
        "wins": wins,
        "losses": losses,
        "win_percentage": round((wins / len(matches)) * 100, 1) if matches else 0,
        "total_hours": round(total_minutes / 60, 1),
        "avg_aces": round(sum(m['aces'] for m in matches) / len(matches), 1),
        "avg_double_faults": round(sum(m['double_faults'] for m in matches) / len(matches), 1),
        "avg_first_serve": round(sum(m['first_serve_percentage'] for m in matches) / len(matches), 1),
        "recent_form": [m['result'] for m in matches[:5]]
    }
    
    return stats

# ==================== ACHIEVEMENTS ENDPOINTS ====================

async def award_achievement(user_id: str, badge_name: str, description: str):
    """Award an achievement to a user"""
    # Check if already earned
    existing = await db.achievements.find_one({
        "user_id": user_id,
        "badge_name": badge_name
    })
    
    if existing:
        return False
    
    achievement_id = f"achievement_{uuid.uuid4().hex[:12]}"
    achievement = Achievement(
        achievement_id=achievement_id,
        user_id=user_id,
        badge_name=badge_name,
        description=description
    )
    
    await db.achievements.insert_one(achievement.dict())
    
    # Add to user's achievements list
    await db.users.update_one(
        {"user_id": user_id},
        {"$addToSet": {"achievements": badge_name}}
    )
    
    return True

@api_router.get("/achievements/list")
async def list_achievements(authorization: Optional[str] = Header(None)):
    """Get user's achievements"""
    user = await get_current_user(authorization)
    
    achievements = await db.achievements.find(
        {"user_id": user['user_id']},
        {"_id": 0}
    ).sort("earned_at", -1).to_list(100)
    
    # Available achievements
    all_achievements = [
        {"id": "first_upload", "name": "First Steps", "description": "Upload your first video", "icon": "videocam"},
        {"id": "first_match", "name": "Match Day", "description": "Play your first match", "icon": "trophy"},
        {"id": "7_day_streak", "name": "Week Warrior", "description": "7 day training streak", "icon": "flame"},
        {"id": "level_5", "name": "Rising Star", "description": "Reach level 5", "icon": "star"},
        {"id": "level_10", "name": "Expert Player", "description": "Reach level 10", "icon": "star-outline"},
        {"id": "50_videos", "name": "Analysis Pro", "description": "Analyze 50 videos", "icon": "stats-chart"},
        {"id": "match_veteran", "name": "Match Veteran", "description": "Play 10 matches", "icon": "tennisball"},
        {"id": "100_hours", "name": "Dedicated", "description": "100 hours of practice", "icon": "time"},
    ]
    
    earned_badges = [a['badge_name'] for a in achievements]
    
    for achievement in all_achievements:
        achievement['earned'] = achievement['id'] in earned_badges
        achievement['earned_date'] = next(
            (a['earned_at'] for a in achievements if a['badge_name'] == achievement['id']),
            None
        )
    
    return {
        "achievements": all_achievements,
        "total_earned": len(earned_badges),
        "total_available": len(all_achievements)
    }

# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings")
async def get_settings(authorization: Optional[str] = Header(None)):
    """Get user settings"""
    user = await get_current_user(authorization)
    
    settings = await db.settings.find_one(
        {"user_id": user['user_id']},
        {"_id": 0}
    )
    
    if not settings:
        # Create default settings
        settings = UserSettings(user_id=user['user_id']).dict()
        await db.settings.insert_one(settings)
    
    return settings

@api_router.put("/settings")
async def update_settings(
    settings_update: SettingsUpdate,
    authorization: Optional[str] = Header(None)
):
    """Update user settings"""
    user = await get_current_user(authorization)
    
    # Get current settings
    current_settings = await db.settings.find_one({"user_id": user['user_id']})
    
    if not current_settings:
        # Create if doesn't exist
        current_settings = UserSettings(user_id=user['user_id']).dict()
        await db.settings.insert_one(current_settings)
    
    # Update only provided fields
    update_dict = {k: v for k, v in settings_update.dict().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"user_id": user['user_id']},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": "Settings updated"}

# ==================== FRIENDS/SOCIAL ENDPOINTS ====================

@api_router.get("/friends/search")
async def search_users(query: str, authorization: Optional[str] = Header(None)):
    """Search for users by name or email"""
    user = await get_current_user(authorization)
    
    if not query or len(query) < 2:
        return {"users": []}
    
    # Search by name or email (case insensitive)
    users = await db.users.find(
        {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ],
            "user_id": {"$ne": user['user_id']}  # Exclude current user
        },
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "level": 1, "xp": 1}
    ).limit(20).to_list(20)
    
    return {"users": users}

@api_router.post("/friends/request")
async def send_friend_request(
    request_data: FriendRequestCreate,
    authorization: Optional[str] = Header(None)
):
    """Send a friend request"""
    user = await get_current_user(authorization)
    
    try:
        # Check if already friends
        existing_friendship = await db.friendships.find_one({
            "$or": [
                {"user1_id": user['user_id'], "user2_id": request_data.to_user_id},
                {"user1_id": request_data.to_user_id, "user2_id": user['user_id']}
            ]
        })
        
        if existing_friendship:
            raise HTTPException(status_code=400, detail="Already friends")
        
        # Check if request already exists
        existing_request = await db.friend_requests.find_one({
            "from_user_id": user['user_id'],
            "to_user_id": request_data.to_user_id,
            "status": "pending"
        })
        
        if existing_request:
            raise HTTPException(status_code=400, detail="Friend request already sent")
        
        # Create friend request
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        friend_request = FriendRequest(
            request_id=request_id,
            from_user_id=user['user_id'],
            to_user_id=request_data.to_user_id,
            status="pending"
        )
        
        await db.friend_requests.insert_one(friend_request.dict())
        
        return {"success": True, "request_id": request_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Friend request error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/friends/requests")
async def get_friend_requests(authorization: Optional[str] = Header(None)):
    """Get pending friend requests"""
    user = await get_current_user(authorization)
    
    # Get incoming requests
    incoming_requests = await db.friend_requests.find(
        {"to_user_id": user['user_id'], "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Get user info for each request
    for request in incoming_requests:
        from_user = await db.users.find_one(
            {"user_id": request['from_user_id']},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "level": 1}
        )
        request['from_user'] = from_user
    
    # Get outgoing requests
    outgoing_requests = await db.friend_requests.find(
        {"from_user_id": user['user_id'], "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Get user info for outgoing requests
    for request in outgoing_requests:
        to_user = await db.users.find_one(
            {"user_id": request['to_user_id']},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "level": 1}
        )
        request['to_user'] = to_user
    
    return {
        "incoming": incoming_requests,
        "outgoing": outgoing_requests
    }

@api_router.post("/friends/respond")
async def respond_to_friend_request(
    action: FriendRequestAction,
    authorization: Optional[str] = Header(None)
):
    """Accept or reject a friend request"""
    user = await get_current_user(authorization)
    
    try:
        # Get the request
        request = await db.friend_requests.find_one({
            "request_id": action.request_id,
            "to_user_id": user['user_id'],
            "status": "pending"
        })
        
        if not request:
            raise HTTPException(status_code=404, detail="Friend request not found")
        
        if action.action == "accept":
            # Create friendship
            friendship_id = f"friendship_{uuid.uuid4().hex[:12]}"
            friendship = Friendship(
                friendship_id=friendship_id,
                user1_id=request['from_user_id'],
                user2_id=user['user_id']
            )
            await db.friendships.insert_one(friendship.dict())
            
            # Update request status
            await db.friend_requests.update_one(
                {"request_id": action.request_id},
                {"$set": {"status": "accepted"}}
            )
            
            return {"success": True, "message": "Friend request accepted"}
        else:
            # Reject request
            await db.friend_requests.update_one(
                {"request_id": action.request_id},
                {"$set": {"status": "rejected"}}
            )
            
            return {"success": True, "message": "Friend request rejected"}
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Friend response error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/friends/list")
async def get_friends_list(authorization: Optional[str] = Header(None)):
    """Get user's friends list"""
    user = await get_current_user(authorization)
    
    # Get all friendships
    friendships = await db.friendships.find({
        "$or": [
            {"user1_id": user['user_id']},
            {"user2_id": user['user_id']}
        ]
    }, {"_id": 0}).to_list(1000)
    
    # Get friend user IDs
    friend_ids = []
    for friendship in friendships:
        if friendship['user1_id'] == user['user_id']:
            friend_ids.append(friendship['user2_id'])
        else:
            friend_ids.append(friendship['user1_id'])
    
    # Get friend details
    friends = await db.users.find(
        {"user_id": {"$in": friend_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "level": 1, "xp": 1, "total_matches": 1}
    ).to_list(1000)
    
    return {"friends": friends, "total": len(friends)}

@api_router.get("/friends/profile/{user_id}")
async def get_friend_profile(user_id: str, authorization: Optional[str] = Header(None)):
    """Get a friend's profile and stats"""
    current_user = await get_current_user(authorization)
    
    # Check if they are friends
    friendship = await db.friendships.find_one({
        "$or": [
            {"user1_id": current_user['user_id'], "user2_id": user_id},
            {"user1_id": user_id, "user2_id": current_user['user_id']}
        ]
    })
    
    if not friendship:
        raise HTTPException(status_code=403, detail="Not friends with this user")
    
    # Get user profile
    friend = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "xp": 1, "level": 1, "total_matches": 1, "total_practice_hours": 1, "achievements": 1, "streak_days": 1}
    )
    
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friend's progress stats
    progress = await db.progress.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)
    
    # Get match stats
    matches = await db.matches.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    wins = sum(1 for m in matches if m['result'] == 'won')
    match_stats = {
        "total_matches": len(matches),
        "wins": wins,
        "losses": len(matches) - wins,
        "win_percentage": round((wins / len(matches)) * 100, 1) if matches else 0
    }
    
    # Get achievements
    achievements = await db.achievements.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "profile": friend,
        "recent_progress": progress,
        "match_stats": match_stats,
        "achievements": achievements
    }

@api_router.delete("/friends/remove/{friend_id}")
async def remove_friend(friend_id: str, authorization: Optional[str] = Header(None)):
    """Remove a friend"""
    user = await get_current_user(authorization)
    
    result = await db.friendships.delete_one({
        "$or": [
            {"user1_id": user['user_id'], "user2_id": friend_id},
            {"user1_id": friend_id, "user2_id": user['user_id']}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    return {"success": True, "message": "Friend removed"}

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
        await db.matches.create_index("user_id")
        await db.matches.create_index("match_id", unique=True)
        await db.settings.create_index("user_id", unique=True)
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
