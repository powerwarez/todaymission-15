import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { EarnedBadge, Badge } from "../types";

// Supabase JOIN 결과 타입 정의
// any 타입 사용 대신 실제 데이터 구조에 맞게 타입 정의
type SupabaseJoinResult = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badges: {
    id: string;
    name: string;
    description: string | null;
    image_path: string;
    created_at: string;
  };
};

export const useEarnedBadges = () => {
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
      const { data, error: fetchError } = await supabase
        .from("earned_badges")
        .select(
          `
          id,
          user_id,
          badge_id,
          earned_at,
          badges:badge_id (
            id,
            name,
            description,
            image_path,
            created_at
          )
        `
        )
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (fetchError) throw fetchError;

      // 데이터 변형: JOIN 결과를 EarnedBadge 타입에 맞게 변환
      // any 대신 명시적인 타입을 사용하되, 타입 단언(as any)으로 타입 오류 해결
      const formattedBadges: EarnedBadge[] =
        data?.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          badge_id: item.badge_id,
          earned_at: item.earned_at,
          badge: {
            id: item.badges.id,
            name: item.badges.name,
            description: item.badges.description,
            image_path: item.badges.image_path,
            created_at: item.badges.created_at,
          } as Badge,
        })) || [];

      setEarnedBadges(formattedBadges);
    } catch (err) {
      console.error("획득한 배지 목록을 가져오는 중 오류 발생:", err);
      setError("배지 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
