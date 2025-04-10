import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { LuX } from "react-icons/lu";
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

  useEffect(() => {
    if (isVisible && user) {
      checkAlreadyEarned();
    }
  }, [isVisible, user]);

  // 이미 해당 주에 획득한 배지가 있는지 확인
  const checkAlreadyEarned = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("earned_badges")
        .select("*")
        .eq("user_id", user.id)
        .eq("badge_type", "weekly")
        .gte("earned_at", weekStartDate)
        .lte("earned_at", weekEndDate);

      if (error) throw error;

      setAlreadyEarned(data && data.length > 0);
    } catch (err) {
      console.error("배지 획득 확인 오류:", err);
    }
  };

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

  if (!isVisible) return null;

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
          <h2 className="text-2xl font-bold text-pink-600 mb-4">
            주간 미션 달성!
          </h2>
          <p className="mb-6">
            {weekStartDate} ~ {weekEndDate} 기간 동안
            <br />
            모든 오늘의 미션을 완료했습니다.
          </p>

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
              className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
            >
              배지 선택하기
            </button>
          )}
        </div>
      </div>

      {showBadgeSelection && !alreadyEarned && (
        <BadgeSelectionModal
          showModal={showBadgeSelection}
          onClose={() => setShowBadgeSelection(false)}
          onBadgeSelect={handleBadgeSelect}
        />
      )}
    </div>
  );
};
