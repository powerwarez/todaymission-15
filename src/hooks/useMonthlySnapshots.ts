import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DailyMissionSnapshot } from '../types';
import { formatInTimeZone } from 'date-fns-tz'; // KST 포맷 함수 import

const timeZone = 'Asia/Seoul'; // 시간대 정의

// 특정 연도와 월의 시작일과 종료일을 KST 기준 YYYY-MM-DD 형식으로 반환
const getMonthDateRangeKST = (year: number, month: number): { startDate: string, endDate: string } => {
  // 해당 월의 1일 KST 00:00 (UTC 00:00 Date 객체로 생성)
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  // 해당 월의 마지막 날 KST 00:00 (UTC 00:00 Date 객체로 생성)
  const endDate = new Date(Date.UTC(year, month, 0));

  // KST 기준으로 yyyy-MM-dd 포맷
  const formatKST = (date: Date): string => formatInTimeZone(date, timeZone, 'yyyy-MM-dd');

  return {
    startDate: formatKST(startDate),
    endDate: formatKST(endDate),
  };
};

export const useMonthlySnapshots = (year: number, month: number) => {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<DailyMissionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlySnapshots = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // KST 기준 월 시작/종료일 사용
    const { startDate, endDate } = getMonthDateRangeKST(year, month);
    console.log('[useMonthlySnapshots] Fetching for KST range:', startDate, '-', endDate); // 범위 확인 로그

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('*') // date, completed_missions_count, total_missions_count 등 포함
        .eq('user_id', user.id)
        // KST 기준 날짜 문자열로 비교
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true }); // 날짜순 정렬

      if (fetchError) throw fetchError;
      setSnapshots(data || []);
    } catch (err: unknown) {
      console.error('Error fetching monthly snapshots:', err);
      setError('월간 스냅샷을 불러오는 중 오류가 발생했습니다.');
      setSnapshots([]); // 에러 시 빈 배열
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    fetchMonthlySnapshots();
  }, [fetchMonthlySnapshots]);

  return { snapshots, loading, error, refetch: fetchMonthlySnapshots };
}; 