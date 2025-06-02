import React from "react";
import { WeekdayStatus } from "../hooks/useWeeklyCompletionStatus";

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ["월", "화", "수", "목", "금"];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({
  weekStatus,
  loading,
  error,
}) => {
  // 상태에 따른 원형 구슬 스타일 반환
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    const baseStyle =
      "rounded-full shadow-md transition-colors duration-200 flex items-center justify-center font-extrabold";
    const sizeStyle = "h-12 w-12";

    let bgColor = "";
    let textColor = "text-gray-700";
    let borderStyle = "";

    // 진행률에 따른 색상 처리
    if (status.totalMissions > 0) {
      const ratio = status.completionRatio;

      if (ratio >= 1.0) {
        // 100% 완료: 진한 녹색
        bgColor = "bg-green-500";
        textColor = "text-white";
      } else if (ratio > 0) {
        // 일부 완료: 진행도에 따라 색상 강도 결정
        if (ratio < 0.25) {
          bgColor = "bg-gray-300";
        } else if (ratio < 0.5) {
          bgColor = "bg-green-100";
        } else if (ratio < 0.75) {
          bgColor = "bg-green-200";
        } else {
          bgColor = "bg-green-300";
        }
      } else {
        // 미완료: 회색 배경
        bgColor = "bg-gray-200";
      }
    } else {
      // 미션이 없는 경우: 연한 회색
      bgColor = "bg-gray-100";
      textColor = "text-gray-400";
    }

    // 오늘 날짜인 경우 테두리 추가
    if (status.isToday) {
      borderStyle = "border-4 border-sky-500 scale-110";
    }

    return `${baseStyle} ${sizeStyle} ${bgColor} ${textColor} ${borderStyle}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center">
        <div className="text-center text-sm text-gray-400 animate-pulse">
          주간 현황 로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center">
        <div className="text-center text-sm text-red-500">오류: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-3 p-6 bg-white rounded-lg min-w-[80px]">
      <h3 className="text-lg font-semibold text-sky-700 mb-2">주간 미션</h3>
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex flex-col items-center">
          <div
            className={getStatusIndicatorStyle(status)}
            title={
              status.totalMissions > 0
                ? `${status.completedMissions}/${status.totalMissions} 미션 완료 (${status.date})`
                : `미션 없음 (${status.date})`
            }
          >
            <span
              className={`text-2xl leading-none ${
                status.isToday ? "animate-pulse" : ""
              }`}
            >
              {dayNames[index]}
            </span>
          </div>
          {status.isToday && (
            <span className="text-xs text-sky-600 mt-1 font-bold">오늘</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay;
