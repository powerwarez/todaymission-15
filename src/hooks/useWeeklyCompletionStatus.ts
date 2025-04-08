import { useState, useEffect, useCallback } from 'react';
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

  const today = new Date();
  const { monday, friday } = getWeekDates(today);
  const formattedMonday = formatDate(monday);
  const formattedFriday = formatDate(friday);

  const fetchWeeklyStatus = useCallback(async () => {
    if (!user) return;
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

      // 2. 스냅샷 데이터를 날짜별 Map으로 변환 (빠른 조회용)
      const snapshotsMap = new Map<string, PartialSnapshot>(); // PartialSnapshot 타입 사용
      (snapshots || []).forEach(snap => snapshotsMap.set(snap.date, snap as PartialSnapshot)); // 타입 단언

      // 3. 월요일부터 금요일까지 순회하며 상태 계산
      const statusResult: WeekdayStatus[] = [];
      const currentDay = new Date(monday);
      for (let i = 1; i <= 5; i++) { // 1: 월요일 ~ 5: 금요일
        const currentDateStr = formatDate(currentDay);
        const snapshot = snapshotsMap.get(currentDateStr);
        let isCompleted: boolean | null = null;

        if (snapshot) {
          isCompleted = snapshot.total_missions_count > 0 &&
                        snapshot.completed_missions_count >= snapshot.total_missions_count;
        }

        statusResult.push({
          dayIndex: i,
          date: currentDateStr,
          isCompleted: isCompleted,
        });

        currentDay.setDate(currentDay.getDate() + 1); // 다음 날짜로 이동
      }

      setWeekStatus(statusResult);

    } catch (err: unknown) {
      console.error('Error fetching weekly completion status:', err);
      setError('주간 완료 현황을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, formattedMonday, formattedFriday, monday]);

  useEffect(() => {
    fetchWeeklyStatus();
  }, [fetchWeeklyStatus]);

  return { weekStatus, loading, error, refetch: fetchWeeklyStatus };
}; 