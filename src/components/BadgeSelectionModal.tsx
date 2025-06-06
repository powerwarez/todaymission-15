import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Badge } from "../types";
import {
  Confetti,
  ConfettiOptions,
  ConfettiRef,
} from "../components/ui/confetti";
import { LuX, LuStar } from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";
import "../styles/animations.css"; // 애니메이션용 CSS 파일

// 배지 선택 모달 props 타입 정의
interface BadgeSelectionModalProps {
  onClose: () => void;
  onBadgeSelect: (badgeId: string, badgeType?: string) => void;
  showModal: boolean;
  weeklyRewardGoal?: string; // 주간 보상 목표 (선택적)
}

export const BadgeSelectionModal: React.FC<BadgeSelectionModalProps> = ({
  onClose,
  onBadgeSelect,
  showModal,
  weeklyRewardGoal,
}) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const [alreadyEarned, setAlreadyEarned] = useState(false);

  // 이미 배지를 획득했는지 확인
  useEffect(() => {
    const checkAlreadyEarnedBadge = async () => {
      // HallOfFame에서 미선택 배지에 대해 호출될 때는 이 검사를 건너뜁니다
      if (!user || !showModal || weeklyRewardGoal) return;

      try {
        // 현재 날짜 기준으로 이번 주의 시작(월요일)과 끝(일요일) 구하기
        const now = new Date();
        const day = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 이번 주 월요일 날짜 계산

        const weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // 이번 주 날짜 문자열
        const weekStartStr = weekStart.toISOString();
        const weekEndStr = weekEnd.toISOString();

        // 이미 이번 주에 weekly_streak_1 배지를 획득했는지 확인
        const { data: existingWeeklyBadge, error: weeklyCheckError } =
          await supabase
            .from("earned_badges")
            .select("*")
            .eq("user_id", user.id)
            .eq("badge_id", "weekly_streak_1")
            .gte("earned_at", weekStartStr)
            .lte("earned_at", weekEndStr);

        if (weeklyCheckError) {
          console.error("주간 미션 배지 확인 오류:", weeklyCheckError);
          return;
        }

        // 이미 이번 주에 배지를 획득했으면 alreadyEarned 상태 업데이트
        if (existingWeeklyBadge && existingWeeklyBadge.length > 0) {
          console.log("이번 주 weekly_streak_1 배지가 이미 획득되었습니다.");
          setAlreadyEarned(true);
        }
      } catch (err) {
        console.error("배지 획득 여부 확인 중 오류 발생:", err);
      }
    };

    checkAlreadyEarnedBadge();
  }, [user, showModal, weeklyRewardGoal]);

  // 주간 미션에 설정된 배지 목록 가져오기
  useEffect(() => {
    const fetchBadges = async () => {
      // Hall of Fame에서 호출된 경우도 배지 목록을 가져옵니다
      if (!user || !showModal) return;

      try {
        setLoading(true);
        setError(null);
        console.log(
          "주간 배지 목록 가져오기",
          weeklyRewardGoal ? "(Hall of Fame에서 호출)" : ""
        );

        // weekly_streak_1 배지 정보 가져오기 (전역으로 사용)
        const { data: weeklyStreakBadge, error: weeklyStreakError } =
          await supabase
            .from("badges")
            .select("name, description")
            .eq("id", "weekly_streak_1")
            .single();

        if (weeklyStreakError) {
          console.error(
            "weekly_streak_1 배지 정보 가져오기 오류:",
            weeklyStreakError
          );
        }

        const weeklyStreakName = weeklyStreakBadge?.name || "주간 미션 달성!";
        const weeklyStreakDescription =
          weeklyStreakBadge?.description ||
          "이번 주 월-금 모든 미션을 모두 완료했습니다!";

        // Hall of Fame에서 호출된 경우에만 이미 획득한 배지 확인 로직을 건너뜁니다
        // 주간 미션 달성 시에는 이 체크를 하지 않습니다
        if (!weeklyRewardGoal) {
          // 주간 미션 달성으로 인한 호출인 경우 배지 확인을 건너뜁니다
          console.log(
            "주간 미션 달성으로 인한 배지 선택 모달 - 중복 체크 건너뜀"
          );
        }

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
          setError(
            "주간 배지 설정이 존재하지 않습니다. 관리자에게 문의하세요."
          );
          setLoading(false);
          return;
        }

        // 배지 ID 목록 추출
        const badgeIds = settingsData.map((item) => item.badge_id);
        console.log("가져올 배지 ID 목록:", badgeIds);

        // 일반 배지와 커스텀 배지 ID 분리 (커스텀 배지는 custom_ 접두사가 있음)
        const regularBadgeIds = badgeIds.filter(
          (id) => !id.startsWith("custom_")
        );
        const customBadgeIds = badgeIds.filter((id) =>
          id.startsWith("custom_")
        );

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
                  name: weeklyStreakName, // weekly_streak_1 배지 이름 사용
                  description: weeklyStreakDescription, // weekly_streak_1 배지 설명 사용
                  image_path: badge.image_path,
                  created_at: badge.created_at,
                  badge_type: "weekly",
                  is_custom: true,
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
            customBadgeIds.forEach((badgeId) => {
              formattedCustomBadges.push({
                id: badgeId,
                name: weeklyStreakName,
                description: weeklyStreakDescription,
                image_path: "", // 기본 이미지는 getBadgeImageUrl에서 처리
                created_at: new Date().toISOString(),
                badge_type: "weekly",
                is_custom: true,
              } as Badge);
            });
          }

          console.log("가져온 커스텀 배지 수:", formattedCustomBadges.length);
        }

        // 4. 모든 배지 합치기
        const allBadges = [...regularBadges, ...formattedCustomBadges];

        if (allBadges.length === 0) {
          console.error(
            "가져온 배지가 없습니다. regularBadges:",
            regularBadges.length,
            "customBadges:",
            formattedCustomBadges.length
          );
          setError(
            "주간 미션에 설정된 배지가 없습니다. 관리자에게 문의하세요."
          );
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

    // Hall of Fame에서 호출된 경우에도 배지 목록을 표시합니다
    if (showModal && user && (!alreadyEarned || weeklyRewardGoal)) {
      fetchBadges();
    }
  }, [showModal, user, alreadyEarned, weeklyRewardGoal]);

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

      console.log(
        "배지 선택:",
        badgeId,
        weeklyRewardGoal ? "(Hall of Fame에서 호출)" : ""
      );

      // Hall of Fame 페이지에서 호출된 경우 다른 로직 실행
      if (weeklyRewardGoal) {
        console.log("Hall of Fame 페이지에서 배지 선택 - 간소화된 로직 사용");

        // 부모 컴포넌트의 onBadgeSelect 함수 직접 호출
        onBadgeSelect(badgeId, "weekly");

        // Confetti 효과 표시
        triggerConfetti();

        // 성공 후 1.5초 뒤 모달 닫기
        setTimeout(() => {
          handleClose();
        }, 1500);

        return;
      }

      // user_info 테이블에서 weekly_reward_goal 가져오기
      let userWeeklyRewardGoal = "";
      try {
        const { data: userInfo, error: userInfoError } = await supabase
          .from("user_info")
          .select("weekly_reward_goal")
          .eq("user_id", user.id)
          .single();

        if (userInfoError) {
          console.error("사용자 정보 가져오기 오류:", userInfoError);
        } else if (userInfo && userInfo.weekly_reward_goal) {
          userWeeklyRewardGoal = userInfo.weekly_reward_goal;
          console.log("사용자 주간 목표:", userWeeklyRewardGoal);
        }
      } catch (err) {
        console.error("사용자 주간 목표 가져오기 중 오류:", err);
      }

      // 배지 정보 가져오기
      const selectedBadgeData = badges.find((badge) => badge.id === badgeId);
      if (!selectedBadgeData) {
        console.error("선택한 배지 정보를 찾을 수 없습니다:", badgeId);
        throw new Error("선택한 배지 정보를 찾을 수 없습니다");
      }

      const isCustomBadge =
        badgeId.startsWith("custom_") || selectedBadgeData.is_custom;
      console.log("커스텀 배지 여부:", isCustomBadge);

      // weekly_streak_1 배지 정보 가져오기
      let weeklyStreakName = "주간 미션 달성!";
      let weeklyStreakDescription =
        "이번 주 월-금 모든 미션을 모두 완료했습니다!";

      try {
        const { data, error } = await supabase
          .from("badges")
          .select("name, description")
          .eq("id", "weekly_streak_1")
          .single();

        if (error) {
          console.error("weekly_streak_1 배지 정보 가져오기 오류:", error);
        } else if (data) {
          weeklyStreakName = data.name;
          weeklyStreakDescription = data.description || weeklyStreakDescription;
        }
      } catch (err) {
        console.error("weekly_streak_1 배지 정보 가져오기 오류:", err);
      }

      // 선택한 배지가 커스텀 배지인 경우 badges 테이블에 레코드가 있는지 확인하고 생성
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
          const { error: insertError } = await supabase.from("badges").insert({
            id: badgeId,
            name: weeklyStreakName, // weekly_streak_1 배지 이름 사용
            description: weeklyStreakDescription, // weekly_streak_1 배지 설명 사용
            image_path: selectedBadgeData.image_path,
            badge_type: "weekly",
            created_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error("badges 테이블에 레코드 생성 오류:", insertError);
            throw insertError;
          }
        }
      }

      // 선택한 배지를 earned_badges 테이블에 저장
      console.log("선택한 배지를 저장합니다:", badgeId);
      const { error: insertError } = await supabase
        .from("earned_badges")
        .insert({
          user_id: user.id,
          badge_id: badgeId, // 선택한 배지 ID
          badge_type: "weekly", // 항상 weekly
          earned_at: new Date().toISOString(),
          reward_text: userWeeklyRewardGoal, // user_info에서 가져온 주간 보상 목표 저장
        });

      if (insertError) {
        console.error("배지 획득 기록 실패:", insertError);
        throw insertError;
      }

      console.log("배지 획득 기록 성공:", {
        badge_id: badgeId,
        badge_type: "weekly",
        reward_text: userWeeklyRewardGoal,
      });

      // Confetti 효과 표시
      triggerConfetti();

      // 선택한 배지 ID를 부모 컴포넌트로 전달
      onBadgeSelect(badgeId, "weekly");
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

  // 모달을 표시하지 않는 조건: showModal이 false이거나, Hall of Fame이 아닌데 이미 획득한 경우
  if (!showModal) {
    console.log("모달 표시하지 않음 - showModal이 false");
    return null;
  }

  // Hall of Fame에서 호출된 경우가 아니고 이미 획득한 경우에만 모달을 표시하지 않음
  if (alreadyEarned && !weeklyRewardGoal) {
    console.log("모달 표시하지 않음 - 이미 획득했고 Hall of Fame이 아님");
    return null;
  }

  console.log("배지 선택 모달 렌더링:", {
    showModal,
    alreadyEarned,
    weeklyRewardGoal,
    badgesCount: badges.length,
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        showModal ? "visible" : "invisible"
      }`}
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      ></div>
      <div
        className={`relative bg-white rounded-2xl w-full max-w-2xl mx-auto p-6 shadow-xl scale-in-center overflow-y-auto max-h-[90vh] ${
          showModal ? "scale-in-center" : "scale-out-center"
        }`}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <LuX size={20} />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6 text-sky-600 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-yellow-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"
              />
            </svg>
            배지를 선택하세요
          </h2>

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

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="w-full min-h-[200px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center text-gray-600 p-6">
              <p>설정된 배지가 없습니다. 관리자에게 문의하세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
              {badges.map((badge, index) => (
                <button
                  key={badge.id}
                  onClick={() => handleBadgeSelect(badge.id)}
                  className={`badge-item p-3 rounded-lg flex flex-col items-center transition-all ${
                    selectedBadge === badge.id
                      ? "bg-sky-100 ring-2 ring-sky-500 transform scale-105"
                      : "bg-gray-100 hover:bg-sky-50"
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 to-purple-500 badge-glow"></div>
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
                  <span className="text-xs md:text-sm font-medium text-center">
                    {badge.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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
                ? "bg-sky-500 text-white hover:bg-sky-600"
                : "bg-sky-300 text-white cursor-not-allowed"
            }`}
          >
            선택 완료
          </button>
        </div>

        <Confetti
          ref={confettiRef}
          autoPlay={showConfetti}
          options={{
            particleCount: 200,
            spread: 90,
          }}
        />
      </div>
    </div>
  );
};
