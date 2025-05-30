import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { LuX, LuStar } from "react-icons/lu";
import { BadgeSelectionModal } from "../BadgeSelectionModal";
import toast from "react-hot-toast";

interface WeeklyBadgeModalProps {
  isVisible: boolean;
  onClose: () => void;
  weekStartDate: string;
  weekEndDate: string;
}

export const WeeklyBadgeModal: React.FC<WeeklyBadgeModalProps> = ({
  isVisible,
  onClose,
  weekStartDate,
  weekEndDate,
}) => {
  const { user } = useAuth();
  const [showBadgeSelection, setShowBadgeSelection] = useState(false);
  const [alreadyEarned, setAlreadyEarned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyRewardGoal, setWeeklyRewardGoal] = useState<string>("");

  // 사용자 정보와 주간 목표 가져오기
  useEffect(() => {
    const fetchWeeklyRewardGoal = async () => {
      if (!user || !isVisible) return;

      try {
        const { data, error } = await supabase
          .from("user_info")
          .select("weekly_reward_goal")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error(
            "주간 보상 목표를 가져오는 중 오류가 발생했습니다:",
            error
          );
        } else if (data && data.weekly_reward_goal) {
          setWeeklyRewardGoal(data.weekly_reward_goal);
        }
      } catch (err) {
        console.error("주간 보상 목표 조회 중 오류가 발생했습니다:", err);
      }
    };

    fetchWeeklyRewardGoal();
  }, [user, isVisible]);

  // 모달이 보여질 때 이미 배지를 획득했는지 확인
  useEffect(() => {
    const checkAlreadyEarned = async () => {
      if (!user || !isVisible) return;

      try {
        setLoading(true);
        // weekly_streak_1 배지가 이번 주에 획득되었는지 확인
        const { data: weeklyStreakBadge, error: weeklyStreakError } =
          await supabase
            .from("earned_badges")
            .select("*")
            .eq("user_id", user.id)
            .eq("badge_id", "weekly_streak_1")
            .eq("badge_type", "weekly")
            .gte("earned_at", weekStartDate)
            .lte("earned_at", weekEndDate);

        if (weeklyStreakError) throw weeklyStreakError;

        // weekly_streak_1 배지가 있으면 상태 업데이트
        if (weeklyStreakBadge && weeklyStreakBadge.length > 0) {
          console.log("이번 주 weekly_streak_1 배지가 이미 획득되었습니다.");
          setAlreadyEarned(true);
          // 획득한 경우 부모 컴포넌트에 알려서 모달을 띄우지 않도록 함
          onClose();
          return;
        }

        // 다른 주간 배지가 획득되었는지 확인
        const { data, error } = await supabase
          .from("earned_badges")
          .select("*")
          .eq("user_id", user.id)
          .eq("badge_type", "weekly")
          .gte("earned_at", weekStartDate)
          .lte("earned_at", weekEndDate);

        if (error) throw error;

        const hasEarnedBadge = data && data.length > 0;
        setAlreadyEarned(hasEarnedBadge);

        // 이미 배지를 획득했으면 모달을 닫음
        if (hasEarnedBadge) {
          onClose();
        }
      } catch (err) {
        console.error("배지 획득 확인 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAlreadyEarned();
  }, [isVisible, user, weekStartDate, weekEndDate, onClose]);

  // 배지 선택 핸들러
  const handleBadgeSelect = async (badgeId: string) => {
    if (!user) return;

    try {
      // 획득한 배지 데이터 저장
      const { error } = await supabase.from("earned_badges").insert({
        user_id: user.id,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
        badge_type: "weekly", // 배지 유형 지정
        reward_text: weeklyRewardGoal, // 주간 보상 목표 저장
      });

      if (error) throw error;

      toast.success("축하합니다! 새로운 배지를 획득했습니다.");
      setShowBadgeSelection(false);
      setTimeout(onClose, 1500); // 1.5초 후 모달 닫기
    } catch (err) {
      console.error("배지 획득 오류:", err);
      toast.error("배지 획득 중 오류가 발생했습니다.");
    }
  };

  // 이미 배지를 획득했거나 로딩 중이거나 모달이 보이지 않아야 하면 null 반환
  if (!isVisible || (alreadyEarned && !loading)) return null;

  // 로딩 중이면 로딩 스피너만 보여줌
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative bg-white rounded-lg p-6 max-w-md w-full m-4 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <LuX size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-sky-600 mb-4">
            주간 미션 달성!
          </h2>
          <p className="mb-4">
            {weekStartDate} ~ {weekEndDate} 기간 동안
            <br />
            모든 오늘의 미션을 완료했습니다.
          </p>

          {/* 주간 목표 표시 */}
          {weeklyRewardGoal && (
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
              <div className="flex items-center justify-center mb-2">
                <LuStar className="text-yellow-500 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-700">
                  이번 주 보상
                </h3>
              </div>
              <p className="text-yellow-800">{weeklyRewardGoal}</p>
            </div>
          )}

          {alreadyEarned ? (
            <div className="bg-green-100 p-4 rounded-md mb-4">
              <p className="text-green-700">
                이미 이번 주에 배지를 획득하셨습니다!
                <br />
                명예의 전당에서 확인하세요.
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowBadgeSelection(true)}
              className="bg-sky-600 text-white px-6 py-3 rounded-lg hover:bg-sky-700 transition-colors"
            >
              배지 선택하기
            </button>
          )}
        </div>
      </div>

      {showBadgeSelection && !alreadyEarned && !loading && (
        <BadgeSelectionModal
          showModal={showBadgeSelection}
          onClose={() => setShowBadgeSelection(false)}
          onBadgeSelect={handleBadgeSelect}
          weeklyRewardGoal={weeklyRewardGoal}
        />
      )}
    </div>
  );
};
