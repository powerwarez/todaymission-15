import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import {
  Confetti,
  ConfettiOptions,
  ConfettiRef,
} from "../components/ui/confetti";
import { LuX, LuUpload } from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";

// 배지 선택 모달 props 타입 정의
interface BadgeSelectionModalProps {
  onClose: () => void;
  onBadgeSelect: (badgeId: string, badgeType: string) => void;
  showModal: boolean;
  preselectedBadges?: string[]; // 미리 선택된 배지 ID 목록
}

export const BadgeSelectionModal: React.FC<BadgeSelectionModalProps> = ({
  onClose,
  onBadgeSelect,
  showModal,
  preselectedBadges = [],
}) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);

  // 배지 목록 가져오기
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setLoading(true);

        // preselectedBadges가 있으면 해당 배지들만 가져오고, 없으면 모든 배지 가져오기
        let query = supabase.from("badges").select("*");

        if (preselectedBadges.length > 0) {
          query = query.in("id", preselectedBadges);
        }

        const { data, error } = await query;

        if (error) throw error;

        setBadges(data || []);
      } catch (err) {
        console.error("배지 목록 가져오기 오류:", err);
        setError("배지 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (showModal) {
      fetchBadges();
    }
  }, [showModal, preselectedBadges]);

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

  // 배지 선택 처리
  const handleBadgeSelect = (badgeId: string) => {
    setSelectedBadge(badgeId);
    setShowConfetti(true);

    // Confetti 효과 표시
    triggerConfetti();

    // 배지 유형을 'weekly'로 지정하여 선택한 배지 ID를 부모 컴포넌트로 전달
    onBadgeSelect(badgeId, "weekly");
  };

  // 파일 업로드 버튼 클릭 처리
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 파일 선택 처리
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `custom/${fileName}`;

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from("badges")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 업로드한 이미지 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("badges").getPublicUrl(filePath);

      // 새 배지 생성 - 배지 유형을 'weekly'로 지정
      const newBadgeId = `custom_${Date.now()}`;
      const newBadge: Badge = {
        id: newBadgeId,
        name: "커스텀 배지",
        description: "나만의 커스텀 배지",
        image_path: publicUrl,
        created_at: new Date().toISOString(),
        badge_type: "weekly", // 배지 유형 지정
      };

      // 배지 DB에 저장
      const { error: insertError } = await supabase
        .from("badges")
        .insert(newBadge);

      if (insertError) throw insertError;

      // 배지 목록 갱신
      setBadges((prev) => [...prev, newBadge]);
      setSelectedBadge(newBadgeId);
      setShowConfetti(true);

      // 배지 유형을 'weekly'로 지정하여 선택한 배지 ID를 부모 컴포넌트로 전달
      onBadgeSelect(newBadgeId, "weekly");
    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      setError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingImage(false);
    }
  };

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setSelectedBadge(null);
    setShowConfetti(false);
    setError(null);
    onClose();
  };

  // Confetti 효과 트리거 (배지 선택 시)
  const triggerConfetti = () => {
    if (!confettiRef.current) return;

    const options: ConfettiOptions = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      gravity: 0.8,
      startVelocity: 30,
      ticks: 300,
      colors: [
        "#FF0000",
        "#FFA500",
        "#FFFF00",
        "#00FF00",
        "#0000FF",
        "#4B0082",
        "#9400D3",
      ],
    };
    confettiRef.current.trigger(options);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      ></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-pink-700">🎖 주간 미션 달성!</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <LuX size={20} />
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            축하합니다! 이번 주 모든 미션을 완료하셨습니다. 아래 배지 중 하나를
            선택하여 획득하세요.
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* 배지 선택 그리드 */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {badges.map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => handleBadgeSelect(badge.id)}
                  className={`p-4 rounded-lg flex flex-col items-center transition-all ${
                    selectedBadge === badge.id
                      ? "bg-pink-100 ring-2 ring-pink-500 transform scale-105"
                      : "bg-gray-100 hover:bg-pink-50"
                  }`}
                >
                  <div className="relative w-24 h-24 mb-2 bg-white rounded-full flex items-center justify-center p-2">
                    <img
                      src={getBadgeImageUrl(badge.image_path)}
                      alt={badge.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error("이미지 로드 오류:", badge.image_path);
                        (e.target as HTMLImageElement).src =
                          "/placeholder_badge.png";
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-center">
                    {badge.name}
                  </span>
                </button>
              ))}

              {/* 직접 업로드 버튼 */}
              <button
                onClick={handleUploadClick}
                disabled={uploadingImage}
                className={`p-4 rounded-lg flex flex-col items-center transition-all ${
                  uploadingImage
                    ? "bg-gray-200 cursor-wait"
                    : "bg-gray-100 hover:bg-pink-50"
                }`}
              >
                <div className="w-24 h-24 mb-2 bg-white rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                  {uploadingImage ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  ) : (
                    <LuUpload size={30} className="text-gray-400" />
                  )}
                </div>
                <span className="text-sm font-medium text-center">
                  {uploadingImage ? "업로드 중..." : "직접 업로드"}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </button>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="flex justify-end border-t pt-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mr-2"
          >
            취소
          </button>
          <button
            onClick={() => selectedBadge && handleBadgeSelect(selectedBadge)}
            disabled={!selectedBadge || loading}
            className={`px-4 py-2 rounded-md ${
              selectedBadge && !loading
                ? "bg-pink-500 text-white hover:bg-pink-600"
                : "bg-pink-300 text-white cursor-not-allowed"
            }`}
          >
            선택 완료
          </button>
        </div>
      </div>

      {/* Confetti 컴포넌트 */}
      {showConfetti && <Confetti ref={confettiRef} />}
    </div>
  );
};
