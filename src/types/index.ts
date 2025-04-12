import { User } from "@supabase/supabase-js";

// Database table types (adjust based on your actual Supabase schema)
export interface Mission {
  id: string; // uuid
  user_id: string; // uuid ref auth.users
  content: string;
  created_at: string; // timestampz
  order: number;
}

export interface MissionLog {
  id: string; // uuid
  user_id: string; // uuid ref auth.users
  mission_id: string; // uuid ref missions
  completed_at: string; // date
  // Add weekday or other relevant info if needed
}

export interface Challenge {
  id: string; // uuid
  name: string;
  description: string;
  // Define condition fields, e.g., required_completions, mission_id_target, etc.
  badge_id: string; // uuid ref badges
  created_at: string; // timestampz
}

export interface Badge {
  id: string; // uuid
  name: string;
  image_path: string; // path in Supabase Storage
  description?: string;
  created_at: string; // timestampz
  badge_type?: "mission" | "weekly"; // 배지 유형 (미션 배지 또는 주간 배지)
}

export interface UserBadge {
  id: string; // uuid
  user_id: string; // uuid ref auth.users
  badge_id: string; // uuid ref badges
  earned_at: string; // timestampz
  badge_type?: "mission" | "weekly"; // 배지 유형 (미션 배지 또는 주간 배지)
}

// Extended types for UI
export interface MissionWithLogs extends Mission {
  logs: MissionLog[]; // Or just today's completion status
  is_completed_today?: boolean; // Helper flag for UI
  log_id?: string; // ID of the completed log for today (if exists)
}

export interface EarnedBadge extends UserBadge {
  badge: Badge;
}

// Auth User type from Supabase
export type AuthUser = User;
