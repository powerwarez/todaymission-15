import React, { useState, useMemo } from 'react';
// import { useMissions } from '../hooks/useMissions'; // 삭제: 스냅샷에서 미션 정보 가져옴
import { useMissionLogs } from '../hooks/useMissionLogs';
// import { useMonthlyMissionLogs } from '../hooks/useMonthlyMissionLogs'; // 삭제: 스냅샷 훅 사용
import { useDailySnapshot } from '../hooks/useDailySnapshot'; // 일별 스냅샷 훅 추가
import { useMonthlySnapshots } from '../hooks/useMonthlySnapshots'; // 월별 스냅샷 훅 추가
import MonthlyCalendar from '../components/MonthlyCalendar';
import { LuBadgeCheck, LuCalendarDays, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { Mission } from '../types'; // Mission 타입만 필요할 수 있음

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDateInput = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const HallOfFamePage: React.FC = () => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today); // 날짜별 기록 조회용
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1)); // 달력용 (월 시작일)

  // --- 날짜별 기록 관련 --- //
  const { snapshot: dailySnapshot, loading: dailySnapshotLoading, error: dailySnapshotError } = useDailySnapshot(selectedDate);
  const { logs: missionLogsForSelectedDate, loading: dailyLogsLoading, error: dailyLogsError } = useMissionLogs(selectedDate);

  // --- 월별 달력 관련 --- //
  const { snapshots: monthlySnapshots, loading: monthlySnapshotsLoading, error: monthlySnapshotsError } = useMonthlySnapshots(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1
  );

  // 로딩 및 에러 상태 통합
  const isLoading = dailySnapshotLoading || dailyLogsLoading || monthlySnapshotsLoading;
  const error = dailySnapshotError || dailyLogsError || monthlySnapshotsError;

  // --- 날짜별 기록 표시 로직 (스냅샷 기반) --- //
  const completedMissionIdsForSelectedDate = useMemo(() => {
    return new Set(missionLogsForSelectedDate.map(log => log.mission_id));
  }, [missionLogsForSelectedDate]);

  const displayedMissionsForSelectedDate = useMemo(() => {
    // 스냅샷이 있으면 스냅샷의 미션 목록 사용, 없으면 빈 배열
    const missionsFromSnapshot: Mission[] = dailySnapshot?.missions_snapshot || []; // 타입 명시
    return missionsFromSnapshot.map((mission: Mission) => ({ // 타입 명시
      ...mission,
      isCompleted: completedMissionIdsForSelectedDate.has(mission.id)
    })).sort((a: Mission, b: Mission) => a.order - b.order); // 타입 명시
  }, [dailySnapshot, completedMissionIdsForSelectedDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(event.target.value + 'T00:00:00'));
  };
  // --- 끝: 날짜별 기록 관련 로직 --- //

  // --- 월별 달력 관련 로직 --- //
  const handlePreviousMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  // --- 끝: 월별 달력 관련 로직 --- //

  // --- 달력에 전달할 총 미션 개수 (현재 사용 안 함) --- //
  // const latestTotalMissionsCount = useMemo(() => {
  //     if (monthlySnapshots && monthlySnapshots.length > 0) {
  //         return monthlySnapshots[monthlySnapshots.length - 1].total_missions_count;
  //     }
  //     return 0; // 스냅샷 없으면 0
  // }, [monthlySnapshots]);
  // --- 끝 --- //

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-pink-700 mb-8">명예의 전당</h1>

      {isLoading && <p>데이터를 불러오는 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 날짜별 기록 조회 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-xl font-semibold text-pink-600 mb-4 flex items-center">
                <LuCalendarDays className="mr-2" /> 날짜별 기록 조회
             </h2>
             <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="record-date" className="text-gray-700">날짜 선택:</label>
                <input
                  type="date"
                  id="record-date"
                  value={formatDateInput(selectedDate)}
                  onChange={handleDateChange}
                  className="border border-pink-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  max={formatDateInput(today)} // 오늘 이후 날짜 선택 불가
                />
             </div>

            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {selectedDate.toLocaleDateString('ko-KR')} 미션 기록
            </h3>
            {!dailySnapshot && !dailySnapshotLoading && (
                 <p className="text-center text-gray-500">선택된 날짜의 기록(스냅샷)이 없습니다.</p>
            )}
            {dailySnapshot && displayedMissionsForSelectedDate.length === 0 && (
              <p className="text-center text-gray-500">이 날짜의 스냅샷에 등록된 미션이 없습니다.</p>
            )}
            {dailySnapshot && displayedMissionsForSelectedDate.length > 0 && (
              <ul className="space-y-3 pr-2"> {/* max-h-60 overflow-y-auto 제거 */}
                {displayedMissionsForSelectedDate.map((mission: Mission & { isCompleted: boolean }) => (
                  <li
                    key={mission.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 text-sm ${
                      mission.isCompleted
                        ? 'bg-green-100 border-l-4 border-green-500'
                        : 'bg-gray-100 border-l-4 border-gray-400'
                    }`}
                  >
                    <span className={`flex-1 ${mission.isCompleted ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                      {mission.content}
                    </span>
                    {mission.isCompleted && (
                      <LuBadgeCheck className="text-green-600 text-lg ml-2" />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {dailySnapshot && displayedMissionsForSelectedDate.length > 0 && missionLogsForSelectedDate.length === 0 && (
                 <p className="mt-4 text-center text-gray-500">이 날짜에는 완료된 미션이 없어요.</p>
            )}
          </div>

          {/* 월별 달력 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold text-pink-600 flex items-center">
                     월간 달성 현황
                 </h2>
                 <div className="flex items-center space-x-2">
                    <button onClick={handlePreviousMonth} className="p-2 rounded hover:bg-pink-100 text-pink-600">
                        <LuChevronLeft size={20} />
                    </button>
                    <span className="text-lg font-medium text-gray-700">
                        {currentMonthDate.getFullYear()}년 {currentMonthDate.getMonth() + 1}월
                    </span>
                    <button onClick={handleNextMonth} className="p-2 rounded hover:bg-pink-100 text-pink-600">
                        <LuChevronRight size={20} />
                    </button>
                 </div>
            </div>
            <MonthlyCalendar
              year={currentMonthDate.getFullYear()}
              month={currentMonthDate.getMonth() + 1}
              snapshots={monthlySnapshots} // 로그 대신 스냅샷 전달
              // totalMissionsCount는 이제 Calendar 내부에서 스냅샷 기준으로 처리하므로 제거
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HallOfFamePage; 