import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import {
  LuPlus,
  LuTrash,
  LuSave,
  LuUpload,
  LuCheck,
} from "react-icons/lu";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Chip from "./ui/Chip";
import Modal from "./ui/Modal";

interface WeeklyBadgeSettingProps {
  userId: string;
}

const WeeklyBadgeSetting: React.FC<WeeklyBadgeSettingProps> = ({ userId }) => {
  const [weeklyBadges, setWeeklyBadges] = useState<Badge[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // weekly_streak_1 배지 정보 state
  const [weeklyStreakBadgeInfo, setWeeklyStreakBadgeInfo] = useState<{
    name: string;
    description: string;
  }>({
    name: "주간 미션 달성!",
    description: "이번 주 월-금 모든 미션을 모두 완료했습니다!",
  });

  // 최대 선택 가능한 배지 수
  const MAX_WEEKLY_BADGES = 5;

  // weekly_streak_1 배지 정보 가져오기
  const fetchWeeklyStreakBadgeInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("name, description")
        .eq("id", "weekly_streak_1")
        .single();

      if (error) {
        console.error("weekly_streak_1 배지 정보 가져오기 오류:", error);
        return;
      }

      if (data) {
        setWeeklyStreakBadgeInfo({
          name: data.name,
          description:
            data.description || "이번 주 월-금 모든 미션을 모두 완료했습니다!",
        });
        console.log("weekly_streak_1 배지 정보:", data);
      }
    } catch (err) {
      console.error("weekly_streak_1 배지 정보 가져오기 오류:", err);
    }
  };

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
      const badgeIds = data?.map((item) => item.badge_id) || [];

      // 배지 ID가 없으면 빈 값 설정 후 반환
      if (badgeIds.length === 0) {
        console.log("설정된 주간 배지가 없습니다.");
        setWeeklyBadges([]);
        setSelectedBadges([]);
        setLoading(false);
        return;
      }

      console.log("가져올 배지 ID 목록:", badgeIds);

      // ID 목록 저장 (선택된 배지 ID)
      setSelectedBadges(badgeIds);

      // 표준 배지 가져오기
      let regularBadgesResult = [] as Badge[];
      const standardBadgeIds = badgeIds.filter(
        (id) => !id.startsWith("custom_")
      );

      if (standardBadgeIds.length > 0) {
        const { data: regularBadges, error: regularError } = await supabase
          .from("badges")
          .select("*")
          .in("id", standardBadgeIds);

        if (regularError) {
          console.error("표준 배지 가져오기 오류:", regularError);
          throw regularError;
        }

        console.log("가져온 표준 배지:", regularBadges);
        regularBadgesResult = regularBadges || [];
      }

      // 커스텀 배지 가져오기
      let formattedCustomBadges = [] as Badge[];
      const customBadgeIds = badgeIds.filter((id) => id.startsWith("custom_"));

      if (customBadgeIds.length > 0) {
        const { data: customBadges, error: customError } = await supabase
          .from("custom_badges")
          .select("*")
          .in("badge_id", customBadgeIds);

        if (customError) {
          console.error("커스텀 배지 가져오기 오류:", customError);
          throw customError;
        }

        console.log("가져온 커스텀 배지:", customBadges);

        // 커스텀 배지 데이터를 Badge 형식으로 변환
        formattedCustomBadges = (customBadges || []).map((badge) => ({
          id: badge.badge_id,
          name: weeklyStreakBadgeInfo.name,
          description: weeklyStreakBadgeInfo.description,
          image_path: badge.image_path,
          created_at: badge.created_at,
          badge_type: badge.badge_type || "weekly",
          created_by: badge.user_id,
          is_custom: true,
        })) as Badge[];
      }

      // 모든 배지 합치기
      const allBadges = [...regularBadgesResult, ...formattedCustomBadges];

      console.log("최종 선택된 배지 목록:", allBadges);

      // 가져온 배지가 있을 경우에만 상태 업데이트
      if (allBadges.length > 0) {
        setWeeklyBadges(allBadges);
      } else {
        console.warn(
          "배지 ID는 있지만 해당하는 배지 데이터를 찾을 수 없습니다."
        );
      }
    } catch (err) {
      console.error("주간 배지 설정 가져오기 오류:", err);
      setError("주간 배지 설정을 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 사용자 커스텀 배지 가져오기
  const fetchCustomBadges = async () => {
    try {
      setLoading(true);
      console.log("커스텀 배지 가져오기 시작 - 사용자 ID:", userId);

      // 사용자의 커스텀 배지 가져오기
      const { data: customBadges, error: customError } = await supabase
        .from("custom_badges")
        .select("*")
        .eq("user_id", userId);

      if (customError) {
        console.error("커스텀 배지 가져오기 오류:", customError);
        throw customError;
      }

      console.log("가져온 커스텀 배지 데이터:", customBadges);

      // 커스텀 배지 데이터를 Badge 형식으로 변환
      const formattedCustomBadges = (customBadges || []).map((badge) => ({
        id: badge.badge_id,
        name: weeklyStreakBadgeInfo.name,
        description: weeklyStreakBadgeInfo.description,
        image_path: badge.image_path,
        created_at: badge.created_at,
        badge_type: badge.badge_type || "weekly",
        created_by: badge.user_id,
        is_custom: true,
      })) as Badge[];

      console.log("변환된 커스텀 배지 목록:", formattedCustomBadges);

      setCustomBadges(formattedCustomBadges);
    } catch (err) {
      console.error("커스텀 배지 가져오기 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 배지 정보와 목록 가져오기
  useEffect(() => {
    if (userId) {
      const loadData = async () => {
        await fetchWeeklyStreakBadgeInfo();
        await fetchWeeklyBadges();
        await fetchCustomBadges();
      };
      loadData();
    }
  }, [userId]);

  // 배지 선택 또는 선택 해제
  const handleBadgeSelect = (badge: Badge) => {
    try {
      console.log("배지 선택/해제:", badge.id, badge.name);

      if (selectedBadges.includes(badge.id)) {
        // 이미 선택된 배지면 선택 해제
        console.log("배지 선택 해제:", badge.id);

        const updatedSelectedBadges = selectedBadges.filter(
          (id) => id !== badge.id
        );
        const updatedWeeklyBadges = weeklyBadges.filter(
          (b) => b.id !== badge.id
        );

        setSelectedBadges(updatedSelectedBadges);
        setWeeklyBadges(updatedWeeklyBadges);

        console.log(
          "업데이트된 선택 배지:",
          updatedSelectedBadges.length,
          "개"
        );
      } else {
        // 새로 선택한 배지면 추가 (최대 5개까지)
        if (selectedBadges.length < MAX_WEEKLY_BADGES) {
          console.log("배지 선택 추가:", badge.id);

          // 중복 체크
          if (!weeklyBadges.some((b) => b.id === badge.id)) {
            const updatedSelectedBadges = [...selectedBadges, badge.id];
            const updatedWeeklyBadges = [...weeklyBadges, badge];

            setSelectedBadges(updatedSelectedBadges);
            setWeeklyBadges(updatedWeeklyBadges);

            console.log(
              "업데이트된 선택 배지:",
              updatedSelectedBadges.length,
              "개"
            );
          } else {
            console.warn("이미 weeklyBadges에 포함된 배지입니다:", badge.id);
          }
        } else {
          console.warn("최대 배지 수 초과");
          toast.error(
            `최대 ${MAX_WEEKLY_BADGES}개의 배지만 선택할 수 있습니다.`
          );
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
      await new Promise((resolve) => setTimeout(resolve, 300));

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

      // 성공 모달 표시 (toast 메시지는 제거하고 커스텀 모달만 사용)
      setShowSuccessModal(true);

      // 2초 후 자동으로 모달 닫기
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);

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

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];

    if (file) {
      // 이미지 파일 타입 검증
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다.");
        return;
      }

      // 파일 크기 검증 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      setSelectedFile(file);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 파일 업로드 취소
  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 이미지 업로드 함수
  const uploadImage = async () => {
    if (!selectedFile || !userId) return null;

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `custom/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("badges")
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      return filePath;
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      return null;
    }
  };

  // 커스텀 배지 저장
  const saveCustomBadge = async () => {
    if (!selectedFile) {
      toast.error("이미지를 선택해주세요.");
      return;
    }

    setUploadLoading(true);

    try {
      // 이미지 업로드
      const imagePath = await uploadImage();

      if (!imagePath) {
        throw new Error("이미지 업로드에 실패했습니다.");
      }

      // 커스텀 배지 ID 생성
      const customBadgeId = `custom_${uuidv4()}`;

      // custom_badges 테이블에 저장
      const { error } = await supabase
        .from("custom_badges")
        .insert({
          badge_id: customBadgeId,
          user_id: userId,
          image_path: imagePath,
          badge_type: "weekly",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("커스텀 배지가 추가되었습니다.");

      // 상태 초기화
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // 모달 닫기
      setShowUploadModal(false);

      // 커스텀 배지 목록 새로고침
      fetchCustomBadges();
    } catch (err) {
      console.error("커스텀 배지 저장 오류:", err);
      toast.error("커스텀 배지 저장에 실패했습니다.");
    } finally {
      setUploadLoading(false);
    }
  };

  // 커스텀 배지 삭제
  const deleteCustomBadge = async (badgeId: string) => {
    try {
      console.log("배지 삭제 시작 - 배지 ID:", badgeId);

      // 이 배지가 현재 선택된 배지인지 확인
      if (selectedBadges.includes(badgeId)) {
        toast.error(
          "선택된 배지는 삭제할 수 없습니다. 먼저 선택을 해제해주세요."
        );
        return;
      }

      // 배지 이미지 경로 찾기
      const badgeToDelete = customBadges.find((badge) => badge.id === badgeId);

      if (!badgeToDelete) {
        toast.error("삭제할 배지를 찾을 수 없습니다.");
        return;
      }

      console.log("삭제할 배지 정보:", badgeToDelete);

      // 먼저 해당 ID로 조회하여 실제로 존재하는지 확인
      const { data: existingBadge, error: findError } = await supabase
        .from("custom_badges")
        .select("*")
        .eq("badge_id", badgeId)
        .single();

      console.log("배지 조회 결과:", { existingBadge, findError });

      if (findError) {
        console.error("배지 조회 오류:", findError);
        if (findError.code === "PGRST116") {
          console.warn("해당 ID의 배지가 데이터베이스에 존재하지 않습니다.");
          // 이미 UI에서 제거
          setCustomBadges((prevBadges) =>
            prevBadges.filter((badge) => badge.id !== badgeId)
          );
          toast.success("배지가 삭제되었습니다.");
          return;
        }
      }

      if (existingBadge) {
        // 조회 결과에서 실제 DB 내의 ID 필드 사용 (테이블의 primary key 필드)
        const actualDatabaseId = existingBadge.id;
        console.log("실제 데이터베이스 ID:", actualDatabaseId);

        // 직접 SQL 실행하여 삭제 (RLS 정책 문제 우회)
        const { data, error } = await supabase.rpc("delete_custom_badge", {
          badge_db_id: actualDatabaseId,
        });

        console.log("RPC 삭제 응답:", { data, error });

        if (error) {
          console.error("배지 삭제 RPC 오류:", error);

          // 대체 방법: 기본 삭제 쿼리 시도
          const { data: deleteData, error: deleteError } = await supabase
            .from("custom_badges")
            .delete()
            .eq("id", actualDatabaseId);

          console.log("기본 삭제 응답:", { deleteData, deleteError });

          if (deleteError) {
            throw deleteError;
          }
        }

        // 스토리지에서 이미지 삭제 시도
        if (badgeToDelete.image_path) {
          try {
            // 이미지 경로가 정확한지 확인
            const imagePath = badgeToDelete.image_path;
            console.log("삭제할 이미지 경로:", imagePath);

            // Storage 경로 정규화
            const cleanPath = imagePath.startsWith("/")
              ? imagePath.substring(1)
              : imagePath;

            const { data: storageData, error: storageError } =
              await supabase.storage.from("badges").remove([cleanPath]);

            console.log("스토리지 삭제 응답:", {
              storageData,
              storageError,
              path: cleanPath,
            });

            if (storageError) {
              console.warn("이미지 파일 삭제 오류:", storageError);
            }
          } catch (storageErr) {
            console.error("스토리지 삭제 프로세스 오류:", storageErr);
          }
        }

        // UI에서도 제거
        setCustomBadges((prevBadges) =>
          prevBadges.filter((badge) => badge.id !== badgeId)
        );
        toast.success("배지가 삭제되었습니다.");
      } else {
        console.warn("배지 데이터가 없습니다.");
        toast.error("배지를 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error("배지 삭제 오류:", err);
      toast.error("배지 삭제에 실패했습니다.");
    }
  };

  return (
    <Card>
      <h2 className="ui-section-title mb-2">주간 미션 달성 배지 설정</h2>
      <p className="ui-text-sub font-medium mb-6">
        주간 미션을 모두 달성했을 때 선택할 수 있는 배지를 설정하세요 (최대
        5개). 사용자는 이 중 하나를 선택하여 획득하게 됩니다.
      </p>

      {error && (
        <div
          role="alert"
          className="ui-card-soft mb-4 font-semibold"
          style={{
            backgroundColor: "var(--color-error-light)",
            color: "var(--color-error-dark)",
          }}
        >
          {error}
        </div>
      )}

      {/* 현재 선택된 배지 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base">선택된 배지</h3>
          <Chip>
            {selectedBadges.length}/{MAX_WEEKLY_BADGES}개 선택됨
          </Chip>
        </div>

        <div className="ui-card-soft mb-4">
          {weeklyBadges.length === 0 ? (
            <p className="text-center ui-text-sub font-semibold py-4">
              선택된 배지가 없습니다. 아래에서 배지를 선택해주세요.
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {weeklyBadges.map((badge) => (
                <li key={badge.id} className="relative">
                  <div
                    className="p-4 flex flex-col items-center"
                    style={{
                      backgroundColor: "var(--ui-surface)",
                      border: "var(--ui-bw-thin) solid var(--ui-ink)",
                      borderRadius: "var(--ui-radius-md)",
                    }}
                  >
                    <div
                      className="w-16 h-16 mb-2 flex items-center justify-center rounded-full p-1 overflow-hidden"
                      style={{
                        backgroundColor: "var(--ui-surface)",
                        border: "var(--ui-bw) solid var(--ui-ink)",
                      }}
                    >
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
                    <h4 className="text-sm text-center truncate w-full">
                      {badge.name}
                    </h4>
                  </div>
                  {/* 터치 기기에서도 보이도록 항상 표시 */}
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    onClick={() => handleBadgeSelect(badge)}
                    className="absolute -top-3 -right-3"
                    title="배지 제거"
                    aria-label={`${badge.name} 배지 제거`}
                  >
                    <LuTrash size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 내 커스텀 배지 목록 */}
      <div className="mb-6">
        <h3 className="text-base mb-2">내 커스텀 배지</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {customBadges.map((badge) => {
            const isSelected = selectedBadges.includes(badge.id);
            return (
              <li key={badge.id} className="relative">
                <button
                  type="button"
                  onClick={() => handleBadgeSelect(badge)}
                  aria-pressed={isSelected}
                  className="w-full p-4 flex flex-col items-center cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--ui-accent-soft)"
                      : "var(--ui-surface)",
                    border: `${
                      isSelected ? "var(--ui-bw)" : "var(--ui-bw-thin)"
                    } solid var(--ui-ink)`,
                    borderRadius: "var(--ui-radius-md)",
                    boxShadow: isSelected ? "var(--ui-shadow-sm)" : "none",
                  }}
                >
                  <div
                    className="w-16 h-16 mb-2 flex items-center justify-center rounded-full p-1 overflow-hidden"
                    style={{
                      backgroundColor: "var(--ui-surface)",
                      border: "var(--ui-bw-thin) solid var(--ui-ink)",
                    }}
                  >
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
                  <span className="text-sm font-bold text-center truncate w-full">
                    {badge.name}
                  </span>
                </button>
                <Button
                  variant="danger"
                  size="sm"
                  iconOnly
                  onClick={() => deleteCustomBadge(badge.id)}
                  className="absolute -top-3 -right-3"
                  title="배지 삭제"
                  aria-label={`${badge.name} 배지 삭제`}
                >
                  <LuTrash size={16} />
                </Button>
              </li>
            );
          })}

          {/* 배지 추가 버튼 */}
          <li>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="w-full h-full min-h-[120px] p-4 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-[var(--ui-surface-soft)]"
              style={{
                border: "var(--ui-bw) dashed var(--ui-ink)",
                borderRadius: "var(--ui-radius-md)",
              }}
            >
              <LuPlus size={24} className="mb-2" />
              <span className="text-sm font-bold">배지 추가</span>
            </button>
          </li>
        </ul>
        {customBadges.length === 0 && (
          <p className="text-center ui-text-sub font-medium mt-3">
            업로드한 커스텀 배지가 없습니다. 배지 추가 버튼을 눌러 새 배지를
            추가해보세요.
          </p>
        )}
      </div>

      {/* 설정 저장 버튼 */}
      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          onClick={saveWeeklyBadgeSettings}
          loading={loading}
        >
          {!loading && <LuSave size={18} />}
          설정 저장
        </Button>
      </div>

      {/* 배지 업로드 모달 */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        ariaLabel="나만의 배지 추가"
      >
        <h3 className="text-lg text-center mb-4 pr-6">나만의 배지 추가</h3>
        <p className="ui-text-sub font-medium text-sm mb-4">
          배지 이미지를 선택하여 업로드하세요. 업로드한 배지는 주간 미션 달성 시
          선택 가능한 배지로 사용됩니다.
        </p>

        {/* 파일 업로드 영역 */}
        <div
          className="p-6 text-center mb-4"
          style={{
            border: "var(--ui-bw) dashed var(--ui-ink)",
            borderRadius: "var(--ui-radius-lg)",
          }}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center">
              {previewUrl && (
                <div
                  className="w-32 h-32 mb-4 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: "var(--ui-surface)",
                    border: "var(--ui-bw) solid var(--ui-ink)",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <p className="text-sm ui-text-sub font-medium mb-2 break-all">
                {selectedFile.name}
              </p>
              <Button size="sm" onClick={handleCancelUpload}>
                취소
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <LuUpload className="h-12 w-12 mb-2 ui-text-sub" />
              <p className="text-sm ui-text-sub font-medium mb-1">
                이미지 파일을 선택하세요
              </p>
              <p className="text-xs ui-text-sub mb-4">PNG, JPG, GIF (최대 5MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*"
              />
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={() => setShowUploadModal(false)}>취소</Button>
          <Button
            variant="primary"
            onClick={saveCustomBadge}
            disabled={!selectedFile}
            loading={uploadLoading}
          >
            업로드
          </Button>
        </div>
      </Modal>

      {/* 설정 저장 완료 알림 */}
      {showSuccessModal && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm" role="status">
          <div className="ui-card flex items-center gap-3 animate-fade-in-up">
            <span
              className="w-10 h-10 flex-none rounded-full flex items-center justify-center"
              style={{
                backgroundColor: "var(--color-success-light)",
                border: "var(--ui-bw-thin) solid var(--color-success-dark)",
                color: "var(--color-success-dark)",
              }}
            >
              <LuCheck size={22} />
            </span>
            <div>
              <h3 className="text-base">설정이 저장되었습니다</h3>
              <p className="text-sm ui-text-sub font-medium">
                주간 미션 달성 배지 설정이 성공적으로 저장되었습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WeeklyBadgeSetting;
