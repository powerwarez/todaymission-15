import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DailyMissionSnapshot } from '../types'; // 타입 정의 필요

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const useDailySnapshot = (date: Date) => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<DailyMissionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = formatDate(date);

  const fetchSnapshot = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('*') // missions_snapshot, total_missions_count 등 포함
        .eq('user_id', user.id)
        .eq('date', formattedDate)
        .maybeSingle(); // 결과가 없거나 하나일 수 있음

      if (fetchError) throw fetchError;
      setSnapshot(data);
    } catch (err: unknown) {
      console.error('Error fetching daily snapshot:', err);
      setError('일일 스냅샷을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, formattedDate]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, loading, error, refetch: fetchSnapshot };
}; 