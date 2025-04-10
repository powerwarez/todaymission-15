import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import { LuPlus, LuTrash, LuSave, LuUpload } from "react-icons/lu";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userUploadedBadges, setUserUploadedBadges] = useState<Badge[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            (item) => {
              const badgeItem = item.badges as unknown as {
                id: string;
                name: string;
                description: string;
                image_path: string;
                created_at: string;
                badge_type?: string;
              };
              return {
                id: badgeItem.id,
                name: badgeItem.name,
                description: badgeItem.description,
                image_path: badgeItem.image_path,
                created_at: badgeItem.created_at,
                badge_type: badgeItem.badge_type || "weekly",
              } as Badge;
            }
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

      // 기본 배지 가져오기 (badges 테이블)
      const { data: regularBadges, error: regularError } = await supabase
        .from("badges")
        .select("*")
        .or("badge_type.eq.weekly,badge_type.is.null");

      if (regularError) throw regularError;

      // 사용자 커스텀 배지 가져오기 (custom_badges 테이블)
      const { data: customBadges, error: customError } = await supabase
        .from("custom_badges")
        .select("*")
        .eq("user_id", userId);

      if (customError) throw customError;

      // 커스텀 배지 데이터를 Badge 형식으로 변환
      const formattedCustomBadges = customBadges?.map(badge => ({
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
      const allBadges = [...(regularBadges || []), ...(formattedCustomBadges || [])];
      
      setAvailableBadges(allBadges);
      
      // 사용자가 업로드한 커스텀 배지 설정
      setUserUploadedBadges(formattedCustomBadges || []);
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

  // 파일 선택 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploadingImage(true);
      setError(null);

      // 파일 타입 확인
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      // 파일 크기 확인 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        setError("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      // 파일명 생성 (사용자 ID + 타임스탬프 + 원본 확장자)
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `custom/${fileName}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("badges")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("스토리지 업로드 오류:", uploadError);
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
      }

      console.log("업로드 성공:", uploadData);

      // 업로드한 이미지 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from("badges")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("업로드된 이미지의 URL을 가져올 수 없습니다");
      }

      const publicUrl = urlData.publicUrl;
      console.log("공개 URL:", publicUrl);

      // 새 배지 ID 생성
      const newBadgeId = `custom_${Date.now()}`;
      
      // custom_badges 테이블에 저장
      const { data: customBadgeData, error: customInsertError } = await supabase
        .from("custom_badges")
        .insert({
          name: "나만의 배지",
          description: "직접 업로드한 배지",
          image_path: publicUrl,
          badge_type: "weekly",
          user_id: userId,
          badge_id: newBadgeId
        })
        .select()
        .single();

      if (customInsertError) {
        console.error("커스텀 배지 저장 오류:", customInsertError);
        toast.error("배지를 저장하지 못했습니다. 이 세션에서만 사용할 수 있습니다.");
      } else {
        console.log("커스텀 배지 저장 성공:", customBadgeData);
        toast.success("배지가 저장되었습니다.");
      }

      // 새로운 배지 객체 생성
      const newBadge: Badge = {
        id: newBadgeId,
        name: "나만의 배지",
        description: "직접 업로드한 배지",
        image_path: publicUrl,
        created_at: new Date().toISOString(),
        badge_type: "weekly",
        created_by: userId
      };

      // 배지 목록에 추가하고 자동 선택
      setAvailableBadges(prev => [...prev, newBadge]);
      setUserUploadedBadges(prev => [...prev, newBadge]);
      
      // 자동으로 최신 업로드 배지 선택
      if (selectedBadges.length < MAX_WEEKLY_BADGES) {
        setSelectedBadges(prev => [...prev, newBadgeId]);
        setWeeklyBadges(prev => [...prev, newBadge]);
      }
    } catch (err) {
      console.error("이미지 업로드 오류:", err);
      setError(`이미지 업로드 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";  // 파일 입력 초기화
      }
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

  // 파일 업로드 버튼 클릭 처리
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
            
            {/* 파일 업로드 인풋 (숨겨짐) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            
            {/* 배지 업로드 버튼 */}
            <button
              onClick={handleUploadClick}
              disabled={uploadingImage}
              className="w-full mb-4 flex items-center justify-center px-4 py-2 bg-blue-50 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-100 transition-colors"
            >
              {uploadingImage ? (
                <span className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></span>
              ) : (
                <LuUpload className="mr-2" size={18} />
              )}
              나만의 배지 이미지 업로드
            </button>
            
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
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
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
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
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