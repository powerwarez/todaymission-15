import React from 'react';
import { DailyMissionSnapshot } from '../types'; // MissionLog 대신 Snapshot 타입 사용

interface MonthlyCalendarProps {
  year: number;
  month: number;
  snapshots: DailyMissionSnapshot[]; // 로그 대신 스냅샷 배열 받기
}

// 날짜별 스냅샷 데이터를 빠르게 찾기 위한 맵 생성
const processSnapshots = (snapshots: DailyMissionSnapshot[]): Map<string, DailyMissionSnapshot> => {
  const snapshotsByDate = new Map<string, DailyMissionSnapshot>();
  snapshots.forEach(snapshot => {
    snapshotsByDate.set(snapshot.date, snapshot); // date는 이미 YYYY-MM-DD 형식
  });
  return snapshotsByDate;
};

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ year, month, snapshots }) => {
  const snapshotsByDate = processSnapshots(snapshots);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingEmptyDays = Array.from({ length: firstDayOfMonth });

  const getDayStyle = (day: number): string => {
    const dateStr = formatDate(new Date(year, month - 1, day));
    const snapshot = snapshotsByDate.get(dateStr);

    if (!snapshot || snapshot.total_missions_count === 0) {
        return 'bg-gray-100 text-gray-400'; // 스냅샷 없거나 총 미션 0개 (흐리게)
    }

    const { completed_missions_count, total_missions_count } = snapshot;

    if (completed_missions_count === 0) {
      return 'bg-gray-200 text-gray-600'; // 완료 0개 (조금 더 진하게)
    }

    const completionRate = completed_missions_count / total_missions_count;

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
    const snapshot = snapshotsByDate.get(dateStr);
    const isToday = dateStr === formatDate(new Date());

    const completedCount = snapshot?.completed_missions_count ?? 0;
    const totalCount = snapshot?.total_missions_count;

    return (
      <div
        key={day}
        className={`h-16 flex flex-col items-center justify-center rounded-md transition-colors duration-200 ${getDayStyle(day)} ${isToday ? 'ring-2 ring-pink-500 ring-offset-1' : ''}`}
      >
        <span className="text-sm font-medium">{day}</span>
        {/* 스냅샷이 있고 총 미션 수가 0보다 클 때만 카운트 표시 */}
        {snapshot && totalCount !== undefined && totalCount > 0 && (
          <span className="text-xs mt-1">{`${completedCount}/${totalCount}`}</span>
        )}
        {/* 스냅샷은 없지만 날짜는 있는 경우 (미래 날짜 등) 빈 칸 유지 */} 
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