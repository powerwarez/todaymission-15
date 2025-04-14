import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { EarnedBadge, Badge } from "../types";

// Supabase JOIN 결과 타입 정의
interface BadgeJoinResult {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge_type?: "mission" | "weekly";
  reward_text?: string;
  reward_used?: boolean;
  badges: {
    id: string;
    name: string;
    description: string | null;
    image_path: string;
    created_at: string;
    badge_type?: "mission" | "weekly";
  };
}

export const useEarnedBadges = (badgeType?: "mission" | "weekly") => {
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnedBadges = useCallback(async () => {
    if (!user) {
      setEarnedBadges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // earned_badges 테이블에서 JOIN을 통해 badge 정보도 함께 가져옴
      let query = supabase
        .from("earned_badges")
        .select(
          `
          id,
          user_id,
          badge_id,
          earned_at,
          badge_type,
          reward_text,
          reward_used,
          badges:badge_id (
            id,
            name,
            description,
            image_path,
            created_at,
            badge_type
          )
        `
        )
        .eq("user_id", user.id);

      // 배지 유형에 따른 필터링
      if (badgeType) {
        query = query.eq("badge_type", badgeType);
      }

      const { data, error: fetchError } = await query.order("earned_at", {
        ascending: false,
      });

      if (fetchError) throw fetchError;

      // 데이터 변형: JOIN 결과를 EarnedBadge 타입에 맞게 변환
      // 타입 단언을 사용하여 타입 안전성 보장
      const formattedBadges: EarnedBadge[] =
        data?.map((item) => {
          // 타입 단언으로 item을 BadgeJoinResult로 취급
          const joinResult = item as unknown as BadgeJoinResult;
          return {
            id: joinResult.id,
            user_id: joinResult.user_id,
            badge_id: joinResult.badge_id,
            earned_at: joinResult.earned_at,
            badge_type:
              joinResult.badge_type ||
              joinResult.badges.badge_type ||
              "mission",
            weekly_reward_goal: joinResult.reward_text,
            reward_used: joinResult.reward_used || false,
            badge: {
              id: joinResult.badges.id,
              name: joinResult.badges.name,
              description: joinResult.badges.description,
              image_path: joinResult.badges.image_path,
              created_at: joinResult.badges.created_at,
              badge_type:
                joinResult.badges.badge_type ||
                joinResult.badge_type ||
                "mission",
            } as Badge,
          };
        }) || [];

      setEarnedBadges(formattedBadges);
    } catch (err) {
      console.error("획득한 배지 목록을 가져오는 중 오류 발생:", err);
      setError("배지 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user, badgeType]);

  useEffect(() => {
    fetchEarnedBadges();
  }, [fetchEarnedBadges]);

  return {
    earnedBadges,
    loading,
    error,
    refetch: fetchEarnedBadges,
  };
};
