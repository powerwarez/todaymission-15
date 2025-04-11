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
  const [userUploadedBadges, setUserUploadedBadges] = useState<Badge[]>([]);

  // 최대 선택 가능한 배지 수
  const MAX_WEEKLY_BADGES = 5;

  // 주간 배지 목록 가져오기 함수 (재사용 가능)
  const fetchWeeklyBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("주간 배지 가져오기 시작");

      // 현재 사용자가 설정한 주간 배지 가져오기
      const { data, error } = await supabase
        .from("weekly_badge_settings")
        .select("badge_id")
        .eq("user_id", userId);

      if (error) {
        console.error("주간 배지 설정 조회 오류:", error);
        throw error;
      }

      // 배지 ID 추출
      const badgeIds = data?.map(item => item.badge_id) || [];
      
      // 배지 ID가 없으면 빈 값 설정 후 반환
      if (badgeIds.length === 0) {
        console.log("설정된 주간 배지가 없습니다.");
        setWeeklyBadges([]);
        setSelectedBadges([]);
        setLoading(false);
        return;
      }
      
      console.log("가져올 배지 ID 목록:", badgeIds);
      
      // 표준 배지 가져오기
      let regularBadgesResult = [] as Badge[];
      if (badgeIds.length > 0) {
        const { data: regularBadges, error: regularError } = await supabase
          .from("badges")
          .select("*")
          .in("id", badgeIds);

        if (regularError) {
          console.error("표준 배지 가져오기 오류:", regularError);
          throw regularError;
        }
        
        console.log("가져온 표준 배지:", regularBadges);
        regularBadgesResult = regularBadges || [];
      }

      // 커스텀 배지 가져오기
      let formattedCustomBadges = [] as Badge[];
      if (badgeIds.length > 0) {
        const { data: customBadges, error: customError } = await supabase
          .from("custom_badges")
          .select("*")
          .in("badge_id", badgeIds);

        if (customError) {
          console.error("커스텀 배지 가져오기 오류:", customError);
          throw customError;
        }
        
        console.log("가져온 커스텀 배지:", customBadges);

        // 커스텀 배지 데이터를 Badge 형식으로 변환
        formattedCustomBadges = (customBadges || []).map(badge => ({
          id: badge.badge_id,
          name: badge.name,
          description: badge.description || "",
          image_path: badge.image_path,
          created_at: badge.created_at,
          badge_type: badge.badge_type || "weekly",
          created_by: badge.user_id,
          is_custom: true
        })) as Badge[];
      }

      // 모든 배지 합치기
      const allBadges = [
        ...regularBadgesResult, 
        ...formattedCustomBadges
      ];
      
      console.log("최종 배지 목록:", allBadges);
      
      // 가져온 배지가 있을 경우에만 상태 업데이트
      if (allBadges.length > 0) {
        setWeeklyBadges(allBadges);
        setSelectedBadges(badgeIds);
      } else {
        console.warn("배지 ID는 있지만 해당하는 배지 데이터를 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("주간 배지 설정 가져오기 오류:", err);
      setError("주간 배지 설정을 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 배지 목록 가져오기
  useEffect(() => {
    if (userId) {
      fetchWeeklyBadges();
    }
  }, [userId]);

  // 사용 가능한 모든 배지 가져오기
  const fetchAvailableBadges = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("사용 가능한 배지 가져오기 시작");

      // 기본 배지 가져오기 (badges 테이블)
      const { data: regularBadges, error: regularError } = await supabase
        .from("badges")
        .select("*")
        .or("badge_type.eq.weekly,badge_type.is.null");

      if (regularError) {
        console.error("기본 배지 가져오기 오류:", regularError);
        throw regularError;
      }
      
      console.log("가져온 기본 배지:", regularBadges?.length || 0, "개");

      // 사용자 커스텀 배지 가져오기 (custom_badges 테이블)
      const { data: customBadges, error: customError } = await supabase
        .from("custom_badges")
        .select("*")
        .eq("user_id", userId);

      if (customError) {
        console.error("커스텀 배지 가져오기 오류:", customError);
        throw customError;
      }
      
      console.log("가져온 커스텀 배지:", customBadges?.length || 0, "개");

      // 커스텀 배지 데이터를 Badge 형식으로 변환
      const formattedCustomBadges = (customBadges || []).map(badge => ({
        id: badge.badge_id || `custom_${badge.id}`,
        name: badge.name,
        description: badge.description || "",
        image_path: badge.image_path,
        created_at: badge.created_at,
        badge_type: badge.badge_type || "weekly",
        created_by: badge.user_id,
        is_custom: true
      })) as Badge[];

      // 모든 배지 합치기
      const allBadges = [...(regularBadges || []), ...formattedCustomBadges];
      console.log("전체 사용 가능한 배지:", allBadges.length, "개");
      
      // 배지 목록 설정
      setAvailableBadges(allBadges);
      
      // 사용자가 업로드한 커스텀 배지 설정
      setUserUploadedBadges(formattedCustomBadges);
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
    try {
      console.log("배지 선택/해제:", badge.id, badge.name);

      if (selectedBadges.includes(badge.id)) {
        // 이미 선택된 배지면 선택 해제
        console.log("배지 선택 해제:", badge.id);
        
        const updatedSelectedBadges = selectedBadges.filter((id) => id !== badge.id);
        const updatedWeeklyBadges = weeklyBadges.filter((b) => b.id !== badge.id);
        
        setSelectedBadges(updatedSelectedBadges);
        setWeeklyBadges(updatedWeeklyBadges);
        
        console.log("업데이트된 선택 배지:", updatedSelectedBadges.length, "개");
      } else {
        // 새로 선택한 배지면 추가 (최대 5개까지)
        if (selectedBadges.length < MAX_WEEKLY_BADGES) {
          console.log("배지 선택 추가:", badge.id);
          
          // 중복 체크
          if (!weeklyBadges.some(b => b.id === badge.id)) {
            const updatedSelectedBadges = [...selectedBadges, badge.id];
            const updatedWeeklyBadges = [...weeklyBadges, badge];
            
            setSelectedBadges(updatedSelectedBadges);
            setWeeklyBadges(updatedWeeklyBadges);
            
            console.log("업데이트된 선택 배지:", updatedSelectedBadges.length, "개");
          } else {
            console.warn("이미 weeklyBadges에 포함된 배지입니다:", badge.id);
          }
        } else {
          console.warn("최대 배지 수 초과");
          toast.error(`최대 ${MAX_WEEKLY_BADGES}개의 배지만 선택할 수 있습니다.`);
        }
      }
    } catch (err) {
      console.error("배지 선택 처리 중 오류:", err);
      toast.error("배지 선택 중 오류가 발생했습니다.");
    }
  };

  // 이미지 URL 생성 함수
  const getBadgeImageUrl = (imagePath: string): string => {
    if (!imagePath) return "/placeholder_badge.png";
    if (imagePath.startsWith("http")) {
      return imagePath;
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
      setError(null);
      console.log("주간 배지 설정 저장 시작:", selectedBadges);

      if (selectedBadges.length === 0) {
        toast.error("최소 한 개 이상의 배지를 선택해주세요.");
        setError("최소 한 개 이상의 배지를 선택해주세요.");
        setLoading(false);
        return;
      }

      // 기존 설정 삭제
      const { error: deleteError } = await supabase
        .from("weekly_badge_settings")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("기존 설정 삭제 오류:", deleteError);
        throw deleteError;
      }
      
      // 삭제 후 약간의 지연 설정 (데이터베이스 일관성 유지를 위해)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 선택된 배지 설정 저장
      const settingsToInsert = selectedBadges.map((badgeId) => ({
        user_id: userId,
        badge_id: badgeId,
      }));
      
      console.log("저장할 설정:", settingsToInsert);

      const { data: insertData, error: insertError } = await supabase
        .from("weekly_badge_settings")
        .insert(settingsToInsert)
        .select();

      if (insertError) {
        console.error("설정 저장 오류:", insertError);
        throw insertError;
      }
      
      console.log("설정 저장 완료:", insertData);
      toast.success("주간 배지 설정이 저장되었습니다.");
      
      // 저장 완료 후 다시 로드하여 최신 데이터 유지
      fetchWeeklyBadges();
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
                <div className="w-16 h-16 mb-2 flex items-center justify-center 
                  border-4 border-gradient-to-r from-pink-300 to-indigo-300 rounded-full 
                  p-1 bg-white shadow-md overflow-hidden">
                  <img
                    src={getBadgeImageUrl(badge.image_path)}
                    alt={badge.name}
                    className="max-w-full max-h-full object-contain rounded-full"
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
            
            {/* 내가 업로드한 배지 섹션 */}
            {userUploadedBadges.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2 pb-1 border-b">내가 업로드한 배지</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {userUploadedBadges.map((badge) => (
                    <button
                      key={badge.id}
                      onClick={() => handleBadgeSelect(badge)}
                      className={`
                        p-4 rounded-lg flex flex-col items-center justify-center text-center
                        ${
                          selectedBadges.includes(badge.id)
                            ? "bg-pink-100 border-2 border-pink-400"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }
                      `}
                    >
                      <div className="w-16 h-16 mb-2 flex items-center justify-center 
                        border-4 border-gradient-to-r from-pink-300 to-indigo-300 rounded-full 
                        p-1 bg-white shadow-md overflow-hidden">
                        <img
                          src={getBadgeImageUrl(badge.image_path)}
                          alt={badge.name}
                          className="max-w-full max-h-full object-contain rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder_badge.png";
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{badge.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 기본 제공 배지 섹션 */}
            <h4 className="font-medium text-gray-700 mb-2 pb-1 border-b">기본 제공 배지</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableBadges
                  .filter(badge => !badge.is_custom)
                  .map((badge) => (
                    <button
                      key={badge.id}
                      onClick={() => handleBadgeSelect(badge)}
                      className={`
                        p-4 rounded-lg flex flex-col items-center justify-center text-center
                        ${
                          selectedBadges.includes(badge.id)
                            ? "bg-pink-100 border-2 border-pink-400"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }
                      `}
                    >
                      <div className="w-16 h-16 mb-2 flex items-center justify-center 
                        border-4 border-gradient-to-r from-pink-300 to-indigo-300 rounded-full 
                        p-1 bg-white shadow-md overflow-hidden">
                        <img
                          src={getBadgeImageUrl(badge.image_path)}
                          alt={badge.name}
                          className="max-w-full max-h-full object-contain rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder_badge.png";
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{badge.name}</span>
                    </button>
                  ))}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowBadgeSelector(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 mr-2"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 설정 저장 버튼 */}
      <div className="flex justify-end mt-6">
        <button
          onClick={saveWeeklyBadgeSettings}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
          ) : (
            <LuSave className="mr-2" size={18} />
          )}
          설정 저장
        </button>
      </div>
    </div>
  );
};

export default WeeklyBadgeSetting;