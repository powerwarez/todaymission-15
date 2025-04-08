import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DailyMissionSnapshot } from '../types';

// 특정 연도와 월의 시작일과 종료일을 YYYY-MM-DD 형식으로 반환
const getMonthDateRange = (year: number, month: number): { startDate: string, endDate: string } => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
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

    const { startDate, endDate } = getMonthDateRange(year, month);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('*') // date, completed_missions_count, total_missions_count 등 포함
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true }); // 날짜순 정렬

      if (fetchError) throw fetchError;
      setSnapshots(data || []);
    } catch (err: unknown) {
      console.error('Error fetching monthly snapshots:', err);
      setError('월간 스냅샷을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    fetchMonthlySnapshots();
  }, [fetchMonthlySnapshots]);

  return { snapshots, loading, error, refetch: fetchMonthlySnapshots };
}; 