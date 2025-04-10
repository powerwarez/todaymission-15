import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
// import { DailyMissionSnapshot } from '../types'; // 제거

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 오늘을 기준으로 현재 주의 월요일과 금요일 날짜 객체 반환
const getWeekDates = (today: Date): { monday: Date, friday: Date } => {
  const currentDay = today.getDay(); // 0(일) ~ 6(토)
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // 일요일이면 이전 주 월요일로
  const diffToFriday = 5 - currentDay;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0); // 날짜 시작 시간으로 설정

  const friday = new Date(today);
  friday.setDate(today.getDate() + diffToFriday);
  friday.setHours(23, 59, 59, 999); // 날짜 종료 시간으로 설정 (포함하기 위해)

  return { monday, friday };
};

// 요일별 완료 상태 타입 정의
export interface WeekdayStatus {
  dayIndex: number; // 1(월) ~ 5(금)
  date: string; // YYYY-MM-DD
  isCompleted: boolean | null; // null: 데이터 없음, true: 완료, false: 미완료
}

// select로 가져올 스냅샷의 타입 정의
interface PartialSnapshot {
    date: string;
    completed_missions_count: number;
    total_missions_count: number;
}

export const useWeeklyCompletionStatus = () => {
  const { user } = useAuth();
  const [weekStatus, setWeekStatus] = useState<WeekdayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 오늘 날짜는 한 번만 생성되도록 useMemo 사용 (이미 TodayMissionPage에서 사용하지만, 훅 독립성을 위해 추가)
  const today = useMemo(() => new Date(), []);

  // 이번 주 월/금 날짜 계산 결과를 useMemo로 캐싱
  const { monday, friday } = useMemo(() => getWeekDates(today), [today]);
  const formattedMonday = useMemo(() => formatDate(monday), [monday]);
  const formattedFriday = useMemo(() => formatDate(friday), [friday]);

  const fetchWeeklyStatus = useCallback(async () => {
    if (!user) return;
    console.log('[useWeeklyCompletionStatus] Fetching weekly status...'); // 로딩 시작 로그
    setLoading(true);
    setError(null);

    try {
      // 1. 해당 주의 스냅샷 데이터 가져오기
      const { data: snapshots, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('date, completed_missions_count, total_missions_count')
        .eq('user_id', user.id)
        .gte('date', formattedMonday)
        .lte('date', formattedFriday)
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      // 2. 해당 주의 로그 데이터도 가져오기 (직접 로그 확인 추가)
      const { data: weeklyLogs, error: logsError } = await supabase
        .from('mission_logs')
        .select('mission_id, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', formattedMonday)
        .lte('completed_at', formattedFriday);

      if (logsError) throw logsError;

      // 날짜별 로그 맵 생성
      const logsByDate = new Map<string, string[]>();
      (weeklyLogs || []).forEach(log => {
        const date = log.completed_at;
        if (!logsByDate.has(date)) {
          logsByDate.set(date, []);
        }
        logsByDate.get(date)?.push(log.mission_id);
      });

      // 3. 스냅샷 데이터를 날짜별 Map으로 변환
      const snapshotsMap = new Map<string, PartialSnapshot>();
      (snapshots || []).forEach(snap => snapshotsMap.set(snap.date, snap as PartialSnapshot));

      // 4. 월요일부터 금요일까지 순회하며 상태 계산
      const statusResult: WeekdayStatus[] = [];
      const currentDay = new Date(monday); // useMemo로 캐싱된 monday 사용
      for (let i = 1; i <= 5; i++) {
        const currentDateStr = formatDate(currentDay);
        const snapshot = snapshotsMap.get(currentDateStr);
        const logsForDay = logsByDate.get(currentDateStr) || [];
        let isCompleted: boolean | null = null;

        if (snapshot) {
          // 로그 데이터가 있으면 로그 데이터 기준으로 완료 여부 판단
          if (logsForDay.length > 0) {
            // 해당 날짜에 최소 1개의 로그가 있으면 미션이 완료된 것으로 간주
            isCompleted = true;
          } else if (snapshot.total_missions_count > 0) {
            // 로그는 없지만 미션이 있는 경우는 미완료로 간주
            isCompleted = false;
          } else {
            // 미션이 없는 경우는 null (표시 안함)
            isCompleted = null;
          }
        } else {
          // 스냅샷 자체가 없는 경우
          // 로그 데이터가 있으면 완료로 판단 (스냅샷은 없지만 로그가 있는 경우)
          if (logsForDay.length > 0) {
            isCompleted = true;
          } else {
            isCompleted = null; // 데이터 없음
          }
        }

        statusResult.push({
          dayIndex: i,
          date: currentDateStr,
          isCompleted: isCompleted,
        });

        currentDay.setDate(currentDay.getDate() + 1);
      }

      setWeekStatus(statusResult);

    } catch (err: unknown) {
      console.error('Error fetching weekly completion status:', err);
      setError('주간 완료 현황을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
    // 의존성 배열에서 monday 제거하고 formattedMonday, formattedFriday 사용
  }, [user, formattedMonday, formattedFriday]);

  useEffect(() => {
    fetchWeeklyStatus();
  }, [fetchWeeklyStatus]);

  return { weekStatus, loading, error, refetch: fetchWeeklyStatus };
}; 