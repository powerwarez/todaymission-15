// src/types.ts
// import { User } from '@supabase/supabase-js'; // 현재 사용되지 않음

// Mission 테이블 구조 정의 (예시)
export interface Mission {
  id: string;
  user_id: string;
  content: string;
  order: number; // 미션 순서
  created_at: string; // ISO 8601 형식의 날짜 문자열
}

// MissionLog 테이블 구조 정의 (예시)
export interface MissionLog {
  id: string;
  user_id: string;
  mission_id: string;
  completed_at: string; // YYYY-MM-DD 형식의 날짜 문자열
  created_at: string; // ISO 8601 형식의 날짜 문자열
}

// 오늘의 미션 페이지에서 사용할 결합된 타입
export interface MissionWithLogs extends Mission {
  is_completed_today: boolean;
  logs: MissionLog[]; // 해당 미션의 모든 로그 (필요시 사용)
}

// Badge 테이블 구조 정의 (예시)
export interface Badge {
  id: string;
  name: string;
  description: string;
  image_path: string; // 배지 이미지 경로 (예: /badges/first_mission.png)
  created_at: string;
  badge_type?: string; // 배지 타입 (weekly, achievement 등)
  created_by?: string; // 배지를 생성한 사용자 ID
  is_custom?: boolean; // 사용자가 직접 업로드한 커스텀 배지인지 여부
}

// EarnedBadge (중간 테이블) 구조 정의 (예시)
export interface EarnedBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string; // 획득 날짜
  badge_type?: string; // 배지 유형 (weekly, mission 등)
  weekly_reward_goal?: string; // DB의 reward_text 필드가 매핑됨 - 주간 미션 보상 목표
  reward_used?: boolean; // 보상 사용 여부
  // JOIN을 통해 가져올 Badge 정보
  badge: Badge;
}

// DailyMissionSnapshot 테이블 구조 정의
export interface DailyMissionSnapshot {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD 형식
  missions_snapshot: Mission[]; // 해당 날짜의 미션 목록 (JSONB 이지만 파싱된 형태)
  total_missions_count: number;
  completed_missions_count: number;
  created_at: string;
} 