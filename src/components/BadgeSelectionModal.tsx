import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import {
  Confetti,
  ConfettiOptions,
  ConfettiRef,
} from "../components/ui/confetti";
import { LuX } from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";
import "../styles/animations.css"; // 애니메이션용 CSS 파일

// 배지 선택 모달 props 타입 정의
interface BadgeSelectionModalProps {
  onClose: () => void;
  onBadgeSelect: (badgeId: string, badgeType: string) => void;
  showModal: boolean;
}

export const BadgeSelectionModal: React.FC<BadgeSelectionModalProps> = ({
  onClose,
  onBadgeSelect,
  showModal,
}) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);

  // 주간 미션에 설정된 배지 목록 가져오기
  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log("주간 배지 목록 가져오기");

        // 1. 먼저 weekly_badge_settings 테이블에서 설정된 배지 ID 가져오기
        const { data: settingsData, error: settingsError } = await supabase
          .from("weekly_badge_settings")
          .select("badge_id")
          .order("created_at", { ascending: false });

        if (settingsError) {
          console.error("주간 배지 설정 가져오기 오류:", settingsError);
          throw settingsError;
        }

        if (!settingsData || settingsData.length === 0) {
          setError("주간 배지 설정이 존재하지 않습니다. 관리자에게 문의하세요.");
          setLoading(false);
          return;
        }

        // 배지 ID 목록 추출
        const badgeIds = settingsData.map(item => item.badge_id);
        console.log("가져올 배지 ID 목록:", badgeIds);
        
        // 일반 배지와 커스텀 배지 ID 분리 (커스텀 배지는 custom_ 접두사가 있음)
        const regularBadgeIds = badgeIds.filter(id => !id.startsWith("custom_"));
        const customBadgeIds = badgeIds.filter(id => id.startsWith("custom_"));
        
        console.log("일반 배지 ID:", regularBadgeIds);
        console.log("커스텀 배지 ID:", customBadgeIds);

        // 2. 일반 배지 가져오기
        let regularBadges: Badge[] = [];
        if (regularBadgeIds.length > 0) {
          const { data, error: regularError } = await supabase
            .from("badges")
            .select("*")
            .in("id", regularBadgeIds);

          if (regularError) {
            console.error("기본 배지 가져오기 오류:", regularError);
            throw regularError;
          }
          
          regularBadges = data || [];
          console.log("가져온 일반 배지 수:", regularBadges.length);
        }

        // 3. 커스텀 배지 가져오기
        const formattedCustomBadges: Badge[] = [];
        if (customBadgeIds.length > 0) {
          console.log("커스텀 배지 조회 시작:", customBadgeIds);
          
          try {
            // 정확히 일치하는 배지만 조회 (exact match)
            const { data: customBadges, error: customError } = await supabase
              .from("custom_badges")
              .select("*")
              .in("badge_id", customBadgeIds); // 정확히 일치하는 항목만 조회

            if (customError) {
              console.error("커스텀 배지 목록 조회 오류:", customError);
              throw customError;
            }
            
            console.log("조회된 커스텀 배지:", customBadges);
            
            // 설정된 커스텀 배지 처리
            if (customBadges && customBadges.length > 0) {
              // 찾은 배지를 formattedCustomBadges에 추가
              for (const badge of customBadges) {
                console.log(`커스텀 배지 추가:`, badge);
                formattedCustomBadges.push({
                  id: badge.badge_id, // 배지 ID 그대로 사용
                  name: badge.name || "커스텀 배지",
                  description: badge.description || "커스텀 배지입니다",
                  image_path: badge.image_path,
                  created_at: badge.created_at,
                  badge_type: "weekly",
                  is_custom: true
                } as Badge);
              }
            }
          } catch (err) {
            console.error("커스텀 배지 조회 중 오류 발생:", err);
          }
          
          // 찾을 수 없는 배지가 있는 경우를 대비해 기본 정보로 추가
          if (formattedCustomBadges.length === 0) {
            console.warn("커스텀 배지를 찾을 수 없어 기본 배지를 사용합니다");
            
            // 기본 커스텀 배지 정보 추가
            customBadgeIds.forEach(badgeId => {
              formattedCustomBadges.push({
                id: badgeId,
                name: "커스텀 배지",
                description: "커스텀 배지입니다",
                image_path: "", // 기본 이미지는 getBadgeImageUrl에서 처리
                created_at: new Date().toISOString(),
                badge_type: "weekly",
                is_custom: true
              } as Badge);
            });
          }
          
          console.log("가져온 커스텀 배지 수:", formattedCustomBadges.length);
        }

        // 4. 모든 배지 합치기
        const allBadges = [
          ...regularBadges,
          ...formattedCustomBadges
        ];

        if (allBadges.length === 0) {
          console.error("가져온 배지가 없습니다. regularBadges:", regularBadges.length, "customBadges:", formattedCustomBadges.length);
          setError("주간 미션에 설정된 배지가 없습니다. 관리자에게 문의하세요.");
        } else {
          console.log("가져온 배지 목록:", allBadges.length, "개");
          setBadges(allBadges);
        }
      } catch (err) {
        console.error("배지 목록 가져오기 오류:", err);
        setError("배지 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (showModal && user) {
      fetchBadges();
    }
  }, [showModal, user]);

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
  const handleBadgeSelect = async (badgeId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setSelectedBadge(badgeId);
      setShowConfetti(true);

      console.log("배지 선택:", badgeId);
      
      // 배지 정보 가져오기
      const selectedBadgeData = badges.find(badge => badge.id === badgeId);
      if (!selectedBadgeData) {
        console.error("선택한 배지 정보를 찾을 수 없습니다:", badgeId);
        throw new Error("선택한 배지 정보를 찾을 수 없습니다");
      }

      const isCustomBadge = badgeId.startsWith("custom_") || selectedBadgeData.is_custom;
      console.log("커스텀 배지 여부:", isCustomBadge);
      
      // 1. 먼저 weekly_streak_1 배지가 이미 획득되었는지 확인
      const { data: existingWeeklyBadge, error: weeklyCheckError } = await supabase
        .from("earned_badges")
        .select("id")
        .eq("user_id", user.id)
        .eq("badge_id", "weekly_streak_1")
        .eq("badge_type", "weekly");
      
      if (weeklyCheckError) {
        console.error("주간 미션 배지 확인 오류:", weeklyCheckError);
        throw weeklyCheckError;
      }
      
      // 2. 선택한 커스텀 배지가 이미 획득되었는지 확인
      const { data: existingCustomBadge, error: customCheckError } = await supabase
        .from("earned_badges")
        .select("id")
        .eq("user_id", user.id)
        .eq("badge_id", badgeId)
        .eq("badge_type", "weekly");
      
      if (customCheckError) {
        console.error("커스텀 배지 확인 오류:", customCheckError);
        throw customCheckError;
      }
      
      // 트랜잭션 처리를 위한 배열
      const badgesToInsert = [];
      
      // 3. weekly_streak_1 배지가 없으면 추가
      if (!existingWeeklyBadge || existingWeeklyBadge.length === 0) {
        badgesToInsert.push({
          user_id: user.id,
          badge_id: "weekly_streak_1", // 주간 미션 달성 배지 ID
          badge_type: "weekly",
          earned_at: new Date().toISOString()
        });
      }
      
      // 4. 선택한 커스텀 배지가 weekly_streak_1이 아니고 아직 획득하지 않았으면 추가
      if (badgeId !== "weekly_streak_1" && (!existingCustomBadge || existingCustomBadge.length === 0)) {
        // 커스텀 배지 테이블에 레코드 생성이 필요한 경우
        if (isCustomBadge) {
          const { data: existingBadge, error } = await supabase
            .from("badges")
            .select("id")
            .eq("id", badgeId)
            .maybeSingle();
            
          if (error) {
            console.error("badges 테이블 조회 오류:", error);
          } else if (!existingBadge) {
            // badges 테이블에 레코드 생성
            const { error: insertError } = await supabase
              .from("badges")
              .insert({
                id: badgeId,
                name: selectedBadgeData.name,
                description: selectedBadgeData.description,
                image_path: selectedBadgeData.image_path,
                badge_type: "weekly",
                created_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.error("badges 테이블에 레코드 생성 오류:", insertError);
              throw insertError;
            }
          }
        }
        
        // 선택한 커스텀 배지 획득 기록 추가
        badgesToInsert.push({
          user_id: user.id,
          badge_id: badgeId,
          badge_type: "weekly",
          earned_at: new Date().toISOString()
        });
      }
      
      // 5. 배지 획득 기록 저장 (있는 경우에만)
      if (badgesToInsert.length > 0) {
        console.log("저장할 배지 데이터:", badgesToInsert);
        
        const { error: insertError } = await supabase
          .from("earned_badges")
          .insert(badgesToInsert);

        if (insertError) {
          console.error("배지 획득 기록 실패:", insertError);
          throw insertError;
        }
        
        console.log("배지 획득 기록 성공");
      } else {
        console.log("이미 획득한 배지입니다. 중복 저장하지 않습니다.");
      }

      // Confetti 효과 표시
      triggerConfetti();

      // 배지 유형을 'weekly'로 지정하여 선택한 배지 ID를 부모 컴포넌트로 전달
      // 항상 weekly_streak_1 배지 ID를 전달하여 도전과제는 주간 미션 달성으로 표시
      onBadgeSelect("weekly_streak_1", "weekly");
      
    } catch (err) {
      console.error("배지 선택/저장 중 오류 발생:", err);
      setError("배지 선택 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
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
              {badges.map((badge, index) => (
                <button
                  key={badge.id}
                  onClick={() => handleBadgeSelect(badge.id)}
                  className={`badge-item p-4 rounded-lg flex flex-col items-center transition-all ${
                    selectedBadge === badge.id
                      ? "bg-pink-100 ring-2 ring-pink-500 transform scale-105"
                      : "bg-gray-100 hover:bg-pink-50"
                  }`}
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 badge-glow"></div>
                    <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center">
                      <img
                        src={getBadgeImageUrl(badge.image_path)}
                        alt={badge.name}
                        className="max-w-[80%] max-h-[80%] object-contain rounded-full"
                        onError={(e) => {
                          console.error("이미지 로드 오류:", badge.image_path);
                          (e.target as HTMLImageElement).src =
                            "/placeholder_badge.png";
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-center">
                    {badge.name}
                  </span>
                </button>
              ))}
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
            onClick={() => {
              if (selectedBadge) {
                handleBadgeSelect(selectedBadge)
                  .then(() => {
                    // 선택 완료 후 모달 닫기 추가
                    setTimeout(() => {
                      handleClose();
                    }, 1500); // confetti 효과를 볼 수 있도록 약간의 지연 추가
                  })
                  .catch((err) => {
                    console.error("배지 선택 완료 중 오류:", err);
                  });
              }
            }}
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

        {/* Confetti 효과 */}
        {showConfetti && <Confetti ref={confettiRef} />}
      </div>
    </div>
  );
};
