import React, { useState, useEffect } from "react";
// import { supabase } from '@/lib/supabaseClient'; // 경로 별칭 대신 상대 경로 사용
import { supabase } from "../lib/supabaseClient";
import { LuAward, LuTriangle } from "react-icons/lu"; // 아이콘 이름 수정
import PageHeader from "../components/ui/PageHeader";
import Spinner from "../components/ui/Spinner";
import Chip from "../components/ui/Chip";

// Badge 타입 정의 (Supabase 스키마 기반)
interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_path: string; // Storage 경로
}

// 화면에 표시할 데이터 타입 (Badge + count)
interface DisplayBadge extends Badge {
  count: number; // 해당 사용자의 배지 획득 횟수
  imageUrl: string | null; // 이미지 공개 URL
}

const BadgeSettingsPage: React.FC = () => {
  const [badges, setBadges] = useState<DisplayBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadgeData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. 현재 사용자 정보 가져오기
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          console.log("사용자가 로그인하지 않았습니다.");
          // 실제 앱에서는 로그인 페이지로 리디렉션 등의 처리가 필요할 수 있음
          setLoading(false);
          return;
        }

        // 2. 모든 배지 목록 가져오기 (badges 테이블)
        const { data: allBadges, error: badgesError } = await supabase
          .from("badges")
          .select("id, name, description, image_path") // 필요한 모든 컬럼 선택
          .not("id", "like", "custom_%"); // custom_ 접두사가 붙은 배지 제외

        if (badgesError) throw badgesError;
        if (!allBadges) throw new Error("배지 정보를 가져올 수 없습니다.");

        // 3. 현재 사용자의 배지 획득 기록 가져오기 (earned_badges 테이블)
        const { data: earnedBadgesData, error: earnedBadgesError } =
          await supabase
            .from("earned_badges")
            .select("badge_id, badge_type") // badge_type도 함께 가져오기
            .eq("user_id", user.id);

        if (earnedBadgesError) throw earnedBadgesError;

        // 4. 배지별 획득 횟수 계산
        const badgeCounts: { [key: string]: number } = {};
        let weeklyBadgeCount = 0; // weekly 타입 배지 총 개수

        if (earnedBadgesData) {
          earnedBadgesData.forEach(
            (record: { badge_id: string; badge_type: string | null }) => {
              // 일반 배지 카운트
              badgeCounts[record.badge_id] =
                (badgeCounts[record.badge_id] || 0) + 1;

              // weekly 타입 배지 카운트 (주간 미션 달성 배지용)
              if (record.badge_type === "weekly") {
                weeklyBadgeCount++;
              }
            }
          );
        }

        // weekly_streak_1 배지의 카운트를 weekly 타입 배지 총 개수로 설정
        badgeCounts["weekly_streak_1"] = weeklyBadgeCount;

        // 5. 배지 이미지 URL 사용 (DB 값을 그대로 사용)
        const displayDataPromises = (allBadges as Badge[]).map(
          async (badge) => {
            // DB에 저장된 image_path 값을 그대로 사용
            const imageUrl = badge.image_path || "/placeholder_badge.png"; // 값이 없으면 플레이스홀더 사용

            console.log(
              `[${badge.name}] Using DB image_path directly:`,
              imageUrl
            ); // 확인용 로그

            return {
              ...badge,
              count: badgeCounts[badge.id] || 0,
              imageUrl: imageUrl, // DB 값을 그대로 할당
            };
          }
        );

        const displayData = await Promise.all(displayDataPromises);
        setBadges(displayData);
      } catch (err: unknown) {
        console.error("데이터 로딩 중 에러 발생:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else if (typeof err === "string") {
          setError(err);
        } else {
          setError("데이터를 불러오는 중 알 수 없는 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBadgeData();
  }, []); // 컴포넌트 마운트 시 1회 실행

  return (
    <div className="px-1 sm:px-2 py-2">
      <PageHeader
        title="달성한 도전과제"
        description="미션을 완료하고 다양한 배지를 모아보세요."
        icon={<LuAward size={24} />}
      />

      {/* 로딩 상태 표시 */}
      {loading && <Spinner label="데이터를 불러오는 중..." />}

      {/* 에러 상태 표시 */}
      {error && (
        <div
          className="ui-card-soft flex items-start gap-2 mb-6 max-w-2xl"
          role="alert"
          style={{
            backgroundColor: "var(--color-error-light)",
            color: "var(--color-error-dark)",
          }}
        >
          <LuTriangle className="flex-none mt-1" />
          <span className="font-semibold">오류가 발생했습니다: {error}</span>
        </div>
      )}

      {/* 데이터 로딩 완료 및 에러 없는 경우 */}
      {!loading && !error && (
        <div>
          <h2 className="ui-section-title mb-4">달성 가능한 배지 목록</h2>
          {badges.length > 0 ? (
            <ul className="space-y-4 max-w-2xl">
              {badges.map((badge) => {
                const achieved = badge.count > 0;
                return (
                  <li
                    key={badge.id}
                    className="ui-card flex items-center justify-between gap-3"
                    style={{ padding: "1rem" }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* 배지 이미지 표시 */}
                      {badge.imageUrl ? (
                        <img
                          src={badge.imageUrl}
                          alt={badge.name}
                          className="w-16 h-16 object-contain flex-none p-1"
                          style={{
                            backgroundColor: "var(--ui-surface-soft)",
                            border: "var(--ui-bw-thin) solid var(--ui-ink)",
                            borderRadius: "var(--ui-radius-md)",
                            filter: achieved ? undefined : "grayscale(1)",
                            opacity: achieved ? 1 : 0.6,
                          }}
                        />
                      ) : (
                        <div
                          className="w-16 h-16 flex-none flex items-center justify-center text-xs ui-text-sub"
                          style={{
                            backgroundColor: "var(--ui-surface-soft)",
                            border: "var(--ui-bw-thin) solid var(--ui-ink)",
                            borderRadius: "var(--ui-radius-md)",
                          }}
                        >
                          No Img
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg break-words">{badge.name}</h3>
                        <p className="text-sm ui-text-sub font-medium break-words">
                          {badge.description || "설명 없음"}
                        </p>
                      </div>
                    </div>
                    {/* 달성 횟수 표시 */}
                    <Chip
                      tone={achieved ? "success" : "default"}
                      className="flex-none"
                    >
                      {achieved ? `${badge.count}회 달성` : "미달성"}
                    </Chip>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ui-text-sub font-semibold text-center py-4">
              표시할 배지가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BadgeSettingsPage;
