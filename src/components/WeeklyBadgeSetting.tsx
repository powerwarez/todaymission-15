import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import { LuPlus, LuTrash, LuSave } from "react-icons/lu";
import { toast } from "react-hot-toast";

interface WeeklyBadgeSettingProps {
  userId: string;
}

const WeeklyBadgeSetting: React.FC<WeeklyBadgeSettingProps> = ({ userId }) => {
  const [weeklyBadges, setWeeklyBadges] = useState<Badge[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);

  // 최대 선택 가능한 배지 수
  const MAX_WEEKLY_BADGES = 5;

  // 주간 배지 목록 가져오기
  useEffect(() => {
    const fetchWeeklyBadges = async () => {
      try {
        setLoading(true);

        // 현재 사용자가 설정한 주간 배지 가져오기
        const { data, error } = await supabase
          .from("weekly_badge_settings")
          .select(
            `
            badge_id,
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
          .eq("user_id", userId);

        if (error) throw error;

        // 배지 데이터 추출 및 변환
        const badgeData =
          data?.map(
            (item) =>
              ({
                id: item.badges.id,
                name: item.badges.name,
                description: item.badges.description,
                image_path: item.badges.image_path,
                created_at: item.badges.created_at,
                badge_type: item.badges.badge_type || "weekly",
              } as Badge)
          ) || [];

        setWeeklyBadges(badgeData);
        setSelectedBadges(badgeData.map((badge) => badge.id));
      } catch (err) {
        console.error("주간 배지 설정 가져오기 오류:", err);
        setError("주간 배지 설정을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchWeeklyBadges();
    }
  }, [userId]);

  // 사용 가능한 모든 배지 가져오기
  const fetchAvailableBadges = async () => {
    try {
      setLoading(true);

      // badge_type='weekly'인 배지 또는 badge_type이 없는 배지 가져오기
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .or("badge_type.eq.weekly,badge_type.is.null");

      if (error) throw error;

      setAvailableBadges(data || []);
    } catch (err) {
      console.error("사용 가능한 배지 가져오기 오류:", err);
      setError("배지 목록을 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 배지 선택기 열기
  const handleOpenBadgeSelector = () => {
    fetchAvailableBadges();
    setShowBadgeSelector(true);
  };

  // 배지 선택 또는 선택 해제
  const handleBadgeSelect = (badge: Badge) => {
    if (selectedBadges.includes(badge.id)) {
      // 이미 선택된 배지면 선택 해제
      setSelectedBadges(selectedBadges.filter((id) => id !== badge.id));
      setWeeklyBadges(weeklyBadges.filter((b) => b.id !== badge.id));
    } else {
      // 새로 선택한 배지면 추가 (최대 5개까지)
      if (selectedBadges.length < MAX_WEEKLY_BADGES) {
        setSelectedBadges([...selectedBadges, badge.id]);
        setWeeklyBadges([...weeklyBadges, badge]);
      } else {
        toast.error(`최대 ${MAX_WEEKLY_BADGES}개의 배지만 선택할 수 있습니다.`);
      }
    }
  };

  // 이미지 URL 생성 함수
  const getBadgeImageUrl = (imagePath: string): string => {
    if (!imagePath) return "/placeholder_badge.png";
    if (imagePath.startsWith("http")) {
      return imagePath.replace(/([^:]\/)\/+/g, "$1");
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const bucketName = "badges";
    const cleanRelativePath = imagePath.replace(/^\/+|\/+$/g, "");
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanRelativePath}`;
  };

  // 설정 저장하기
  const saveWeeklyBadgeSettings = async () => {
    try {
      setLoading(true);

      // 기존 설정 삭제
      const { error: deleteError } = await supabase
        .from("weekly_badge_settings")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // 선택된 배지 설정 저장
      const settingsToInsert = selectedBadges.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
      }));

      const { error: insertError } = await supabase
        .from("weekly_badge_settings")
        .insert(settingsToInsert);

      if (insertError) throw insertError;

      toast.success("주간 배지 설정이 저장되었습니다.");
    } catch (err) {
      console.error("주간 배지 설정 저장 오류:", err);
      setError("주간 배지 설정을 저장하는 중 오류가 발생했습니다.");
      toast.error("주간 배지 설정 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        주간 미션 달성 배지 설정
      </h2>
      <p className="text-gray-600 mb-6">
        주간 미션을 모두 달성했을 때 선택할 수 있는 배지를 설정하세요 (최대
        5개). 사용자는 이 중 하나를 선택하여 획득하게 됩니다.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 현재 선택된 배지 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">선택된 배지</h3>
          <span className="text-sm text-gray-500">
            {selectedBadges.length}/{MAX_WEEKLY_BADGES}개 선택됨
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {weeklyBadges.map((badge) => (
            <div key={badge.id} className="relative group">
              <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center hover:bg-pink-50 transition-colors">
                <div className="w-16 h-16 mb-2 flex items-center justify-center">
                  <img
                    src={getBadgeImageUrl(badge.image_path)}
                    alt={badge.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/placeholder_badge.png";
                    }}
                  />
                </div>
                <h4 className="text-sm font-medium text-center truncate w-full">
                  {badge.name}
                </h4>
              </div>
              <button
                onClick={() => handleBadgeSelect(badge)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 invisible group-hover:visible transition-all"
                title="배지 제거"
              >
                <LuTrash size={16} />
              </button>
            </div>
          ))}

          {/* 배지 추가 버튼 */}
          {selectedBadges.length < MAX_WEEKLY_BADGES && (
            <button
              onClick={handleOpenBadgeSelector}
              className="bg-gray-100 hover:bg-gray-200 p-4 rounded-lg flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 transition-colors"
            >
              <LuPlus size={24} className="text-gray-500 mb-2" />
              <span className="text-sm text-gray-500">배지 추가</span>
            </button>
          )}
        </div>
      </div>

      {/* 배지 선택 모달 */}
      {showBadgeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowBadgeSelector(false)}
          ></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">배지 선택</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableBadges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => handleBadgeSelect(badge)}
                    className={`