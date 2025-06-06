import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { toZonedTime, format } from "date-fns-tz";
import { useNotification } from "../contexts/NotificationContext";

// 시간대 설정
const timeZone = "Asia/Seoul";

// 날짜를 YYYY-MM-DD 형식으로 포맷 (KST 시간대 고려)
const formatDate = (date: Date): string => {
  return format(toZonedTime(date, timeZone), "yyyy-MM-dd", { timeZone });
};

// 오늘을 기준으로 현재 주의 월요일과 금요일 날짜 객체 반환 (KST 기준)
const getWeekDates = (today: Date): { monday: Date; friday: Date } => {
  // 오늘 날짜를 KST로 변환
  const todayKST = toZonedTime(today, timeZone);
  // KST 기준 요일 (0:일요일, 1:월요일, ..., 6:토요일)
  const currentDay = todayKST.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // 일요일이면 이전 주 월요일로
  const diffToFriday = 5 - currentDay;

  // 월요일 계산
  const monday = new Date(todayKST);
  monday.setDate(todayKST.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0); // 날짜 시작 시간으로 설정

  // 금요일 계산 (실제로는 주간 배지 확인을 위해 일요일까지 포함)
  const friday = new Date(todayKST);
  friday.setDate(todayKST.getDate() + diffToFriday);
  friday.setHours(23, 59, 59, 999); // 날짜 종료 시간으로 설정 (포함하기 위해)

  return { monday, friday };
};

// 요일별 완료 상태 타입 정의
export interface WeekdayStatus {
  dayIndex: number; // 1(월) ~ 5(금)
  date: string; // YYYY-MM-DD
  isCompleted: boolean | null; // null: 데이터 없음, true: 완료, false: 미완료
  isToday: boolean; // 오늘인지 여부 추가
  completionRatio: number; // 0.0 ~ 1.0 사이의 완료 비율
  totalMissions: number; // 총 미션 수
  completedMissions: number; // 완료된 미션 수
}

// select로 가져올 스냅샷의 타입 정의
interface PartialSnapshot {
  date: string;
  completed_missions_count: number;
  total_missions_count: number;
}

export const useWeeklyCompletionStatus = () => {
  const { user } = useAuth();
  const { showBadgeNotification } = useNotification();
  const [weekStatus, setWeekStatus] = useState<WeekdayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 주간 스트릭 달성 상태
  const [weeklyStreakAchieved, setWeeklyStreakAchieved] = useState(false);
  // 이미 보상을 받았는지 여부
  const [weeklyStreakRewarded, setWeeklyStreakRewarded] = useState(false);

  // 오늘 날짜는 한 번만 생성되도록 useMemo 사용 (KST 기준)
  const today = useMemo(() => new Date(), []);
  // KST로 변환된 오늘 날짜
  const todayKST = useMemo(() => toZonedTime(today, timeZone), [today]);

  // 이번 주 월/금 날짜 계산 결과를 useMemo로 캐싱 (KST 기준)
  const { monday, friday } = useMemo(() => getWeekDates(todayKST), [todayKST]);
  // 포맷된 날짜 문자열도 KST 기준으로 생성
  const formattedMonday = useMemo(() => formatDate(monday), [monday]);
  const formattedFriday = useMemo(() => formatDate(friday), [friday]);

  // 주간 스트릭 달성 여부 확인
  const checkWeeklyStreak = useCallback(
    async (weeklyStatus: WeekdayStatus[]) => {
      if (!user || weeklyStreakRewarded || weeklyStreakAchieved) return;

      // 오늘이 금요일인지 확인 (KST 기준)
      const todayKST = toZonedTime(new Date(), timeZone);
      const dayOfWeek = todayKST.getDay(); // 0: 일요일, 1: 월요일, ..., 5: 금요일, 6: 토요일
      const isFriday = dayOfWeek === 5;

      // 금요일이 아니면 체크하지 않음
      if (!isFriday) {
        console.log("오늘은 금요일이 아니므로 주간미션 체크를 하지 않습니다.");
        return;
      }

      // 모든 날짜가 완료되었는지 확인 (월~금 모든 일일미션 달성)
      const allCompleted = weeklyStatus.every(
        (day) => day.isCompleted === true
      );

      console.log("🔍 주간미션 달성 체크:");
      console.log("- 금요일 여부:", isFriday);
      console.log("- 모든 날짜 완료 여부:", allCompleted);
      console.log(
        "- 개별 날짜 상태:",
        weeklyStatus.map((day) => ({
          date: day.date,
          completed: day.isCompleted,
          isToday: day.isToday,
        }))
      );
      console.log("- 이미 달성 상태:", weeklyStreakAchieved);
      console.log("- 이미 보상 받음:", weeklyStreakRewarded);

      if (allCompleted && !weeklyStreakAchieved && !weeklyStreakRewarded) {
        console.log("🎉 금요일에 주간 미션 모두 완료!");
        setWeeklyStreakAchieved(true);

        try {
          // 이번 주 월요일과 일요일 구하기 (한국 시간 기준)
          const mondayStart = new Date(monday);
          mondayStart.setHours(0, 0, 0, 0);

          // 일요일 계산 (이번 주 끝)
          const todayKST = toZonedTime(new Date(), timeZone);
          const currentDay = todayKST.getDay();
          const diffToSunday = currentDay === 0 ? 0 : 7 - currentDay; // 일요일이면 오늘, 아니면 다음 일요일
          const sunday = new Date(todayKST);
          sunday.setDate(todayKST.getDate() + diffToSunday);
          sunday.setHours(23, 59, 59, 999);

          console.log(
            `[StateHook] Checking weekly streak between ${mondayStart.toISOString()} and ${sunday.toISOString()}`
          );

          // 주간 스트릭 배지 획득 여부 확인 (이번 주 전체 기간, badge_type이 weekly인 모든 배지)
          const { data: existingRewards, error: checkError } = await supabase
            .from("earned_badges")
            .select("id, badge_id, badge_type, earned_at")
            .eq("user_id", user.id)
            .eq("badge_type", "weekly")
            .gte("earned_at", mondayStart.toISOString())
            .lte("earned_at", sunday.toISOString());

          if (checkError) throw checkError;

          console.log("주간 스트릭 획득 여부:", existingRewards);

          // 이미 배지를 획득했는지 확인
          if (existingRewards && existingRewards.length > 0) {
            console.log("이미 이번 주에 주간 스트릭 배지를 획득했습니다.");
            setWeeklyStreakRewarded(true);
          } else {
            // 아직 배지가 부여되지 않았다면 배지 선택 모달 표시
            console.log("주간 스트릭 배지 선택 모달 표시");
            showBadgeNotification("weekly_streak_1");
            setWeeklyStreakRewarded(true);
          }
        } catch (err) {
          console.error("주간 스트릭 확인 중 오류:", err);
        }
      } else if (!allCompleted && isFriday) {
        console.log("금요일이지만 모든 미션이 완료되지 않았습니다.");
      }
    },
    [
      user,
      monday,
      weeklyStreakAchieved,
      weeklyStreakRewarded,
      showBadgeNotification,
    ]
  );

  // 무한 루프 방지를 위한 ref
  const isProcessing = useRef(false);

  const fetchWeeklyStatus = useCallback(async () => {
    if (!user || isProcessing.current) return;

    isProcessing.current = true;
    setLoading(true);
    setError(null);

    try {
      // 1. 해당 주의 스냅샷 데이터 가져오기
      const { data: snapshots, error: fetchError } = await supabase
        .from("daily_mission_snapshots")
        .select("date, completed_missions_count, total_missions_count")
        .eq("user_id", user.id)
        .gte("date", formattedMonday)
        .lte("date", formattedFriday)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;

      // 2. 해당 주의 로그 데이터도 가져오기
      const { data: weeklyLogs, error: logsError } = await supabase
        .from("mission_logs")
        .select("mission_id, completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", formattedMonday)
        .lte("completed_at", formattedFriday);

      if (logsError) throw logsError;

      // 날짜별 로그 맵 생성
      const logsByDate = new Map<string, string[]>();
      (weeklyLogs || []).forEach((log) => {
        const date = log.completed_at;
        if (!logsByDate.has(date)) {
          logsByDate.set(date, []);
        }
        logsByDate.get(date)?.push(log.mission_id);
      });

      // 3. 스냅샷 데이터를 날짜별 Map으로 변환
      const snapshotsMap = new Map<string, PartialSnapshot>();
      (snapshots || []).forEach((snap) =>
        snapshotsMap.set(snap.date, snap as PartialSnapshot)
      );

      // 4. 월요일부터 금요일까지 순회하며 상태 계산
      const statusResult: WeekdayStatus[] = [];
      const currentDay = new Date(monday);

      // 오늘 날짜 문자열 (KST 기준)
      const todayStr = formatDate(todayKST);

      for (let i = 1; i <= 5; i++) {
        const currentDateStr = formatDate(currentDay);
        const snapshot = snapshotsMap.get(currentDateStr);
        const logsForDay = logsByDate.get(currentDateStr) || [];
        let isCompleted: boolean | null = null;

        if (snapshot) {
          // 총 미션 수와 완료된 미션 수 설정
          const totalMissions = snapshot.total_missions_count || 0;
          const completedMissions = snapshot.completed_missions_count || 0;

          console.log(
            `[${currentDateStr}] 스냅샷 - 총: ${totalMissions}, 완료: ${completedMissions}, 로그: ${logsForDay.length}`
          );

          // 스냅샷의 completed_missions_count와 total_missions_count 비교로 완료 여부 판단
          if (totalMissions > 0 && completedMissions >= totalMissions) {
            // 모든 미션이 완료된 경우
            isCompleted = true;
            console.log(`[${currentDateStr}] ✅ 일일미션 완료됨`);
          } else if (totalMissions > 0) {
            // 미션이 있지만 완료되지 않은 경우
            isCompleted = false;
            console.log(
              `[${currentDateStr}] ❌ 일일미션 미완료 (${completedMissions}/${totalMissions})`
            );
          } else {
            // 미션이 없는 경우는 null (표시 안함)
            isCompleted = null;
            console.log(`[${currentDateStr}] ⚫ 미션 없음`);
          }
        } else {
          // 스냅샷 자체가 없는 경우
          // 로그 데이터가 있으면 완료로 판단 (스냅샷은 없지만 로그가 있는 경우)
          if (logsForDay.length > 0) {
            isCompleted = true;
            console.log(
              `[${currentDateStr}] ✅ 스냅샷 없지만 로그 있음 - 완료로 처리`
            );
          } else {
            isCompleted = null; // 데이터 없음
            console.log(`[${currentDateStr}] ⚫ 스냅샷과 로그 모두 없음`);
          }
        }

        statusResult.push({
          dayIndex: i,
          date: currentDateStr,
          isCompleted: isCompleted,
          isToday: currentDateStr === todayStr,
          completionRatio: snapshot
            ? snapshot.total_missions_count > 0
              ? Math.min(
                  1.0,
                  snapshot.completed_missions_count /
                    snapshot.total_missions_count
                )
              : 0
            : 0,
          totalMissions: snapshot ? snapshot.total_missions_count : 0,
          completedMissions: snapshot ? snapshot.completed_missions_count : 0,
        });

        currentDay.setDate(currentDay.getDate() + 1);
      }

      console.log(
        "📊 주간 상태 요약:",
        statusResult.map((day) => ({
          date: day.date,
          isCompleted: day.isCompleted,
          ratio: `${day.completedMissions}/${day.totalMissions}`,
        }))
      );

      setWeekStatus(statusResult);

      // 주간 스트릭 달성 여부 확인
      checkWeeklyStreak(statusResult);
    } catch (err: unknown) {
      console.error("Error fetching weekly status:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error occurred");
      }
    } finally {
      setLoading(false);
      isProcessing.current = false;
    }
  }, [user, formattedMonday, formattedFriday]);

  useEffect(() => {
    if (user) {
      fetchWeeklyStatus();
    }
  }, [user, formattedMonday, formattedFriday]);

  return {
    weekStatus,
    loading,
    error,
    refetch: fetchWeeklyStatus,
    weeklyStreakAchieved,
  };
};
