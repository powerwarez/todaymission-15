import React, { useState, useMemo } from "react";
// import { useMissions } from '../hooks/useMissions'; // 삭제: 스냅샷에서 미션 정보 가져옴
import { useMissionLogs } from "../hooks/useMissionLogs";
// import { useMonthlyMissionLogs } from '../hooks/useMonthlyMissionLogs'; // 삭제: 스냅샷 훅 사용
import { useDailySnapshot } from "../hooks/useDailySnapshot"; // 일별 스냅샷 훅 추가
import { useMonthlySnapshots } from "../hooks/useMonthlySnapshots"; // 월별 스냅샷 훅 추가
import { useEarnedBadges } from "../hooks/useEarnedBadges"; // 획득한 배지 목록 가져오는 훅 추가
import MonthlyCalendar from "../components/MonthlyCalendar";
import {
  LuBadgeCheck,
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuMedal,
  LuAward,
} from "react-icons/lu";
import { Mission } from "../types"; // Mission 타입만 필요할 수 있음
// date-fns-tz import 추가, format 추가
import { formatInTimeZone, toZonedTime, format } from "date-fns-tz";

// 시간대 설정
const timeZone = "Asia/Seoul";

const HallOfFamePage: React.FC = () => {
  const initialDate = new Date();
  // KST로 해석된 현재 시각 (Date 객체는 아님, ZonedDateTime 유사 객체)
  const todayKSTObj = toZonedTime(initialDate, timeZone);

  // selectedDate는 KST 기준 날짜를 나타내는 Date 객체 (UTC 타임스탬프는 KST 자정)
  const [selectedDate, setSelectedDate] = useState(
    // KST 날짜 문자열을 만들어 UTC 자정으로 파싱
    new Date(format(todayKSTObj, "yyyy-MM-dd", { timeZone }) + "T00:00:00Z")
  );

  // currentMonthDate는 해당 월의 1일 UTC 00:00:00을 나타내는 Date 객체
  const [currentMonthDate, setCurrentMonthDate] = useState(
    new Date(Date.UTC(todayKSTObj.getFullYear(), todayKSTObj.getMonth(), 1))
  );

  // --- 날짜별 기록 관련 --- //
  // 훅에는 KST 기준 YYYY-MM-DD 문자열 전달
  const formattedSelectedDate = useMemo(() => {
    // selectedDate (UTC 자정 Date 객체)를 KST 기준으로 yyyy-MM-dd 포맷
    return format(toZonedTime(selectedDate, timeZone), "yyyy-MM-dd", {
      timeZone,
    });
  }, [selectedDate]);

  // useDailySnapshot과 useMissionLogs는 이제 문자열을 받도록 수정될 예정
  // 린터 오류는 다음 단계에서 훅 수정 시 해결됨
  const {
    snapshot: dailySnapshot,
    loading: dailySnapshotLoading,
    error: dailySnapshotError,
  } = useDailySnapshot(formattedSelectedDate);
  const {
    logs: missionLogsForSelectedDate,
    loading: dailyLogsLoading,
    error: dailyLogsError,
  } = useMissionLogs(formattedSelectedDate);

  // --- 월별 달력 관련 --- //
  const currentYear = currentMonthDate.getUTCFullYear();
  const currentMonth = currentMonthDate.getUTCMonth() + 1;
  const {
    snapshots: monthlySnapshots,
    loading: monthlySnapshotsLoading,
    error: monthlySnapshotsError,
  } = useMonthlySnapshots(currentYear, currentMonth);

  // --- 배지 관련 데이터 가져오기 --- //
  const {
    earnedBadges,
    loading: badgesLoading,
    error: badgesError,
  } = useEarnedBadges();

  // 로딩 및 에러 상태 통합
  const isLoading =
    dailySnapshotLoading ||
    dailyLogsLoading ||
    monthlySnapshotsLoading ||
    badgesLoading;
  const error =
    dailySnapshotError ||
    dailyLogsError ||
    monthlySnapshotsError ||
    badgesError;

  // --- 날짜별 기록 표시 로직 (스냅샷 기반) --- //
  const completedMissionIdsForSelectedDate = useMemo(() => {
    return new Set(missionLogsForSelectedDate.map((log) => log.mission_id));
  }, [missionLogsForSelectedDate]);

  const displayedMissionsForSelectedDate = useMemo(() => {
    const missionsFromSnapshot: Mission[] =
      dailySnapshot?.missions_snapshot || [];
    return missionsFromSnapshot
      .map((mission: Mission) => ({
        ...mission,
        isCompleted: completedMissionIdsForSelectedDate.has(mission.id),
      }))
      .sort((a: Mission, b: Mission) => a.order - b.order);
  }, [dailySnapshot, completedMissionIdsForSelectedDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateString = event.target.value; // YYYY-MM-DD
    // 입력된 YYYY-MM-DD 문자열 (KST 기준 날짜)을 UTC 자정 Date 객체로 변환
    setSelectedDate(new Date(selectedDateString + "T00:00:00Z"));
  };
  // --- 끝: 날짜별 기록 관련 로직 --- //

  // --- 월별 달력 관련 로직 --- //
  const handlePreviousMonth = () => {
    setCurrentMonthDate(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1))
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1))
    );
  };
  // --- 끝: 월별 달력 관련 로직 --- //

  // 배지 이미지 URL 생성 함수
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-500 to-yellow-500 text-transparent bg-clip-text flex items-center">
        <span className="mr-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-yellow-500"
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
        </span>
        명예의 전당
      </h1>

      {isLoading && <p>데이터를 불러오는 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}

      {!isLoading && !error && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 날짜별 기록 조회 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-pink-600 mb-4 flex items-center">
                <LuCalendarDays className="mr-2" /> 날짜별 기록 조회
              </h2>
              <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="record-date" className="text-gray-700">
                  날짜 선택:
                </label>
                <input
                  type="date"
                  id="record-date"
                  // value는 KST 기준 yyyy-MM-dd
                  value={format(
                    toZonedTime(selectedDate, timeZone),
                    "yyyy-MM-dd",
                    { timeZone }
                  )}
                  onChange={handleDateChange}
                  className="border border-pink-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  // max도 KST 기준 yyyy-MM-dd
                  max={format(todayKSTObj, "yyyy-MM-dd", { timeZone })}
                />
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {/* 표시는 KST 기준으로 */}
                {formatInTimeZone(
                  selectedDate,
                  timeZone,
                  "yyyy년 M월 d일"
                )}{" "}
                미션 기록
              </h3>
              {!dailySnapshot && !dailySnapshotLoading && (
                <p className="text-center text-gray-500">
                  선택된 날짜에는 오늘의 미션 기록이 없어요.
                </p>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length === 0 && (
                  <p className="text-center text-gray-500">
                    이 날짜에 등록된 오늘의 미션이 없어요.
                  </p>
                )}
              {dailySnapshot && displayedMissionsForSelectedDate.length > 0 && (
                <ul className="space-y-3 pr-2">
                  {" "}
                  {/* max-h-60 overflow-y-auto 제거 */}
                  {displayedMissionsForSelectedDate.map(
                    (mission: Mission & { isCompleted: boolean }) => (
                      <li
                        key={mission.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 text-sm ${
                          mission.isCompleted
                            ? "bg-green-100 border-l-4 border-green-500"
                            : "bg-gray-100 border-l-4 border-gray-400"
                        }`}
                      >
                        <span
                          className={`flex-1 ${
                            mission.isCompleted
                              ? "text-green-800 line-through"
                              : "text-gray-800"
                          }`}
                        >
                          {mission.content}
                        </span>
                        {mission.isCompleted && (
                          <LuBadgeCheck className="text-green-600 text-lg ml-2" />
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length > 0 &&
                missionLogsForSelectedDate.length === 0 && (
                  <p className="mt-4 text-center text-gray-500">
                    이 날짜에는 완료된 미션이 없어요.
                  </p>
                )}
            </div>

            {/* 월별 달력 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-pink-600 flex items-center">
                  월간 달성 현황
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-2 rounded hover:bg-pink-100 text-pink-600"
                  >
                    <LuChevronLeft size={20} />
                  </button>
                  <span className="text-lg font-medium text-gray-700">
                    {/* 표시도 KST 기준으로 */}
                    {formatInTimeZone(currentMonthDate, timeZone, "yyyy년 M월")}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded hover:bg-pink-100 text-pink-600"
                  >
                    <LuChevronRight size={20} />
                  </button>
                </div>
              </div>
              <MonthlyCalendar
                year={currentMonthDate.getUTCFullYear()}
                month={currentMonthDate.getUTCMonth() + 1}
                snapshots={monthlySnapshots}
              />
            </div>
          </div>

          {/* 획득한 배지 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-pink-600 mb-6 flex items-center">
              <LuAward className="mr-2" /> 획득한 배지
            </h2>

            {earnedBadges.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                아직 획득한 배지가 없습니다. 주간 미션을 완료하여 배지를
                획득해보세요!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {earnedBadges.map((earnedBadge) => {
                  const badge = earnedBadge.badge;
                  const earnedDate = new Date(earnedBadge.earned_at);

                  return (
                    <div
                      key={earnedBadge.id}
                      className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-20 h-20 mb-2 flex items-center justify-center">
                        <img
                          src={getBadgeImageUrl(badge.image_path)}
                          alt={badge.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder_badge.png";
                          }}
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 text-center">
                        {badge.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {formatInTimeZone(earnedDate, timeZone, "yyyy.MM.dd")}{" "}
                        획득
                      </p>
                      {badge.description && (
                        <p className="text-xs text-gray-600 mt-1 text-center">
                          {badge.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HallOfFamePage;
