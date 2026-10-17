import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { getBadgeImageUrl } from "../lib/badgeImage";
import { LuAward, LuTarget, LuTriangle } from "react-icons/lu";
import PageHeader from "../components/ui/PageHeader";
import Spinner from "../components/ui/Spinner";
import Chip from "../components/ui/Chip";

// Badge 타입 정의 (Supabase 스키마 기반)
interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_path: string; // Storage 경로 또는 /badges/ 정적 경로
}

// 배지와 연결된 도전과제 조건 (정렬/그룹화용)
interface ChallengeCondition {
  badge_id: string;
  condition_type: string;
  required_count: number;
}

// 화면에 표시할 데이터 타입 (Badge + count + 그룹 정보)
interface DisplayBadge extends Badge {
  count: number; // 해당 사용자의 배지 획득 횟수
  imageUrl: string | null; // 이미지 공개 URL
  group: GroupKey;
  order: number; // 그룹 내 정렬 값 (작을수록 앞)
  goalLabel: string | null; // 달성 조건 요약
}

type GroupKey = "hero" | "streak" | "weekly" | "total" | "etc";

// 화면에 보여줄 그룹 순서와 설명
const GROUPS: { key: GroupKey; title: string; description: string }[] = [
  {
    key: "hero",
    title: "오늘의 영웅",
    description: "하루 미션을 모두 끝낸 날이 쌓일수록 얻는 배지예요.",
  },
  {
    key: "streak",
    title: "연속 달성",
    description: "오늘의 영웅을 며칠 연속으로 달성했는지 확인해요. 주말은 쉬어도 괜찮아요.",
  },
  {
    key: "weekly",
    title: "주간 완주",
    description: "월~금 미션을 모두 끝낸 주가 늘어날수록 얻는 배지예요.",
  },
  {
    key: "total",
    title: "누적 미션",
    description: "지금까지 완료한 미션 개수에 따라 얻는 배지예요.",
  },
  { key: "etc", title: "기타", description: "" },
];

// 반복 도전과제는 같은 그룹의 맨 뒤로 보낸다
const REPEATABLE_ORDER_OFFSET = 1_000_000;

// 배지/도전과제 조건으로 그룹과 정렬 값, 조건 문구를 결정
const classifyBadge = (
  badgeId: string,
  challenge: ChallengeCondition | undefined
): { group: GroupKey; order: number; goalLabel: string | null } => {
  if (!challenge) {
    if (badgeId === "daily_hero") {
      return { group: "hero", order: 0, goalLabel: "하루 미션 모두 완료" };
    }
    return { group: "etc", order: 0, goalLabel: null };
  }

  const count = challenge.required_count;
  switch (challenge.condition_type) {
    case "ALL_MISSIONS_DAILY":
      return { group: "hero", order: 0, goalLabel: "하루 미션 모두 완료" };
    case "DAILY_COMPLETIONS":
      return { group: "hero", order: count, goalLabel: `오늘의 영웅 ${count}회` };
    case "DAILY_COMPLETIONS_REPEATABLE":
      return {
        group: "hero",
        order: REPEATABLE_ORDER_OFFSET + count,
        goalLabel: `오늘의 영웅 ${count}회마다`,
      };
    case "MISSION_STREAK":
      return { group: "streak", order: count, goalLabel: `${count}일 연속` };
    case "weekly_streak_mon_fri":
      return { group: "weekly", order: 0, goalLabel: "월~금 미션 모두 완료" };
    case "WEEKLY_COMPLETIONS":
      return { group: "weekly", order: count, goalLabel: `주간 완주 ${count}회` };
    case "TOTAL_COMPLETIONS":
      return { group: "total", order: count, goalLabel: `미션 ${count}개 완료` };
    default:
      return { group: "etc", order: count, goalLabel: null };
  }
};

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
          setLoading(false);
          return;
        }

        // 2. 모든 배지 목록 가져오기 (badges 테이블)
        const { data: allBadges, error: badgesError } = await supabase
          .from("badges")
          .select("id, name, description, image_path")
          .not("id", "like", "custom_%"); // custom_ 접두사가 붙은 배지 제외

        if (badgesError) throw badgesError;
        if (!allBadges) throw new Error("배지 정보를 가져올 수 없습니다.");

        // 3. 배지별 도전과제 조건 가져오기 (정렬/그룹화용)
        const { data: challengeRows, error: challengesError } = await supabase
          .from("challenges")
          .select("badge_id, condition_type, required_count");

        if (challengesError) throw challengesError;
        const challengeByBadgeId = new Map<string, ChallengeCondition>();
        (challengeRows ?? []).forEach((row) => {
          challengeByBadgeId.set(row.badge_id, row);
        });

        // 4. 현재 사용자의 배지 획득 기록 가져오기 (earned_badges 테이블)
        const { data: earnedBadgesData, error: earnedBadgesError } =
          await supabase
            .from("earned_badges")
            .select("badge_id, badge_type") // badge_type도 함께 가져오기
            .eq("user_id", user.id);

        if (earnedBadgesError) throw earnedBadgesError;

        // 5. 배지별 획득 횟수 계산
        const badgeCounts: { [key: string]: number } = {};
        let weeklyBadgeCount = 0; // weekly 타입 배지 총 개수

        earnedBadgesData?.forEach(
          (record: { badge_id: string; badge_type: string | null }) => {
            badgeCounts[record.badge_id] =
              (badgeCounts[record.badge_id] || 0) + 1;

            // weekly 타입 배지 카운트 (주간 미션 달성 배지용)
            if (record.badge_type === "weekly") {
              weeklyBadgeCount++;
            }
          }
        );

        // weekly_streak_1 배지의 카운트를 weekly 타입 배지 총 개수로 설정
        badgeCounts["weekly_streak_1"] = weeklyBadgeCount;

        // 6. 화면 표시용 데이터 구성 (DB 의 image_path 사용)
        const displayData: DisplayBadge[] = (allBadges as Badge[]).map(
          (badge) => ({
            ...badge,
            count: badgeCounts[badge.id] || 0,
            imageUrl: getBadgeImageUrl(badge.image_path),
            ...classifyBadge(badge.id, challengeByBadgeId.get(badge.id)),
          })
        );
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

  // 그룹별로 묶고, 그룹 안에서는 조건이 쉬운 순서대로 정렬
  const sections = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        badges: badges
          .filter((badge) => badge.group === group.key)
          .sort(
            (a, b) =>
              a.order - b.order || a.name.localeCompare(b.name, "ko")
          ),
      })).filter((section) => section.badges.length > 0),
    [badges]
  );

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
        <div className="max-w-2xl space-y-10">
          {sections.length === 0 && (
            <p className="ui-text-sub font-semibold text-center py-4">
              표시할 배지가 없습니다.
            </p>
          )}

          {sections.map((section) => {
            const achievedCount = section.badges.filter(
              (badge) => badge.count > 0
            ).length;
            return (
              <section key={section.key} aria-labelledby={`group-${section.key}`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h2 id={`group-${section.key}`} className="ui-section-title">
                    {section.title}
                  </h2>
                  <Chip
                    tone={achievedCount > 0 ? "success" : "default"}
                    className="flex-none"
                  >
                    {achievedCount}/{section.badges.length} 달성
                  </Chip>
                </div>
                {section.description && (
                  <p className="text-sm ui-text-sub font-medium mb-4">
                    {section.description}
                  </p>
                )}

                <ul className="space-y-4">
                  {section.badges.map((badge) => {
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
                            {badge.goalLabel && (
                              <p className="flex items-center gap-1 text-xs font-extrabold mt-1">
                                <LuTarget size={14} className="flex-none" />
                                {badge.goalLabel}
                              </p>
                            )}
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgeSettingsPage;
