import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { MissionLog } from '../types';

// 특정 연도와 월의 시작일과 종료일을 YYYY-MM-DD 형식으로 반환
const getMonthDateRange = (year: number, month: number): { startDate: string, endDate: string } => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 해당 월의 마지막 날
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

export const useMonthlyMissionLogs = (year: number, month: number) => {
  const { user } = useAuth();
  const [monthlyLogs, setMonthlyLogs] = useState<MissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { startDate, endDate } = getMonthDateRange(year, month);

    try {
      const { data, error: fetchError } = await supabase
        .from('mission_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate) // Greater than or equal to start date
        .lte('completed_at', endDate);   // Less than or equal to end date

      if (fetchError) throw fetchError;
      setMonthlyLogs(data || []);
    } catch (err: unknown) {
      console.error('Error fetching monthly mission logs:', err);
      setError('월간 미션 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useEffect(() => {
    fetchMonthlyLogs();
  }, [fetchMonthlyLogs]);

  return { monthlyLogs, loading, error, refetch: fetchMonthlyLogs };
}; 