import React from 'react';
import { MissionLog } from '../types';

interface MonthlyCalendarProps {
  year: number;
  month: number;
  logs: MissionLog[];
  totalMissionsCount: number; // 해당 사용자의 총 미션 개수
}

// 날짜별 완료 로그 수를 계산하는 헬퍼 함수
const processLogs = (logs: MissionLog[]): Map<string, number> => {
  const logsByDate = new Map<string, number>();
  logs.forEach(log => {
    const dateStr = log.completed_at; // YYYY-MM-DD 형식
    logsByDate.set(dateStr, (logsByDate.get(dateStr) || 0) + 1);
  });
  return logsByDate;
};

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ year, month, logs, totalMissionsCount }) => {
  const logsByDate = processLogs(logs);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingEmptyDays = Array.from({ length: firstDayOfMonth });

  const getDayStyle = (day: number): string => {
    const dateStr = formatDate(new Date(year, month - 1, day));
    const completedCount = logsByDate.get(dateStr) || 0;

    if (completedCount === 0) {
      return 'bg-gray-100 text-gray-500'; // 완료 0개
    }
    if (totalMissionsCount === 0) return 'bg-gray-100 text-gray-500'; // 분모 0 방지

    const completionRate = completedCount / totalMissionsCount;

    if (completionRate >= 1) {
      return 'bg-green-500 text-white font-bold'; // 100% 완료
    } else if (completionRate >= 0.6) {
      return 'bg-green-300 text-green-800'; // 60% 이상
    } else if (completionRate >= 0.3) {
      return 'bg-yellow-300 text-yellow-800'; // 30% 이상
    } else {
      return 'bg-red-300 text-red-800'; // 30% 미만
    }
  };

  const renderDay = (day: number) => {
    const dateStr = formatDate(new Date(year, month - 1, day));
    const completedCount = logsByDate.get(dateStr) || 0;
    const isToday = dateStr === formatDate(new Date());

    return (
      <div
        key={day}
        className={`h-16 flex flex-col items-center justify-center rounded-md transition-colors duration-200 ${getDayStyle(day)} ${isToday ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
      >
        <span className="text-sm font-medium">{day}</span>
        {totalMissionsCount > 0 && completedCount > 0 && (
          <span className="text-xs mt-1">{`${completedCount}/${totalMissionsCount}`}</span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-600 mb-2">
        <div>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div>토</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {leadingEmptyDays.map((_, index) => (
          <div key={`empty-${index}`} className="h-16"></div>
        ))}
        {days.map(day => renderDay(day))}
      </div>
    </div>
  );
};

export default MonthlyCalendar; 