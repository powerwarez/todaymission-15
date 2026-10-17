import React from "react";
import { WeekdayStatus } from "../hooks/useWeeklyCompletionStatus";
import Card from "./ui/Card";
import Spinner from "./ui/Spinner";

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ["월", "화", "수", "목", "금"];

// 진행률에 따라 구슬 배경/글자 색 결정 (모두 테마 변수 기반)
const getIndicatorColors = (
  status: WeekdayStatus
): { background: string; color: string } => {
  if (status.totalMissions <= 0) {
    // 미션이 없는 날
    return {
      background: "var(--ui-surface)",
      color: "color-mix(in srgb, var(--ui-text) 40%, transparent)",
    };
  }

  const ratio = status.completionRatio;
  if (ratio >= 1) {
    // 100% 완료
    return { background: "var(--ui-accent)", color: "var(--ui-on-accent)" };
  }
  if (ratio > 0) {
    // 일부 완료: 진행도만큼 강조색을 섞는다
    const percent = Math.round(25 + ratio * 55);
    return {
      background: `color-mix(in srgb, var(--ui-accent) ${percent}%, var(--ui-surface))`,
      color: "var(--ui-text)",
    };
  }
  // 미완료
  return { background: "var(--ui-surface-soft)", color: "var(--ui-text)" };
};

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({
  weekStatus,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <Card>
        <Spinner label="주간 현황 로딩 중..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <p role="alert" className="ui-error-text text-center">
          주간 현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center">
      <h3 className="ui-section-title mb-4">주간 미션</h3>
      {/* 모바일: 가로 배치, 데스크탑: 세로 배치 */}
      <ul className="flex flex-row md:flex-col items-start md:items-center gap-3">
        {weekStatus.map((status, index) => {
          const colors = getIndicatorColors(status);
          return (
            <li key={status.dayIndex} className="flex flex-col items-center">
              <div
                className="flex items-center justify-center rounded-full font-extrabold h-11 w-11 sm:h-14 sm:w-14 text-lg sm:text-xl"
                style={{
                  background: colors.background,
                  color: colors.color,
                  border: "var(--ui-bw) solid var(--ui-ink)",
                  boxShadow: status.isToday ? "var(--ui-shadow)" : "none",
                  transform: status.isToday ? "translateY(-2px)" : undefined,
                }}
                title={
                  status.totalMissions > 0
                    ? `${status.completedMissions}/${status.totalMissions} 미션 완료 (${status.date})`
                    : `미션 없음 (${status.date})`
                }
                aria-label={
                  status.totalMissions > 0
                    ? `${dayNames[index]}요일 ${status.completedMissions}/${status.totalMissions} 미션 완료`
                    : `${dayNames[index]}요일 미션 없음`
                }
              >
                {dayNames[index]}
              </div>
              {status.isToday && (
                <span className="ui-chip mt-2" style={{ fontSize: "0.7rem" }}>
                  오늘
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default WeeklyStatusDisplay;
