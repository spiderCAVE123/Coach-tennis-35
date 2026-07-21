export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  xp: number;
  level: number;
  premium: boolean;
  streak_days: number;
  last_activity?: string;
  created_at: string;
}

export interface VideoAnalysis {
  technique_score: number;
  footwork_feedback: string;
  swing_timing: string;
  contact_point: string;
  balance_rating: number;
  suggested_fixes: string[];
  pro_comparison: string;
  annotated_image_base64?: string;
  measurements?: Record<string, number>;
}

export interface Video {
  video_id: string;
  user_id: string;
  shot_type: string;
  analyzed: boolean;
  analysis_result?: VideoAnalysis;
  created_at: string;
}

export interface TrainingPlan {
  plan_id: string;
  user_id: string;
  goal: string;
  skill_level: string;
  weakness: string;
  daily_drills: Drill[];
  weekly_schedule: WeeklyFocus[];
  created_at: string;
}

export interface Drill {
  name: string;
  description: string;
  reps: number;
  duration: string;
}

export interface WeeklyFocus {
  day: string;
  focus: string;
}

export interface Challenge {
  challenge_id: string;
  user_id: string;
  challenge_type: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  reward_xp: number;
  created_at: string;
}

export interface LeaderboardEntry {
  name: string;
  xp: number;
  level: number;
  picture?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
