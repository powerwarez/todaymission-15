import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DailyMissionSnapshot } from '../types'; // 타입 정의 필요

// 사용하지 않는 formatDate 함수 제거

// 파라미터 타입을 string으로 변경
export const useDailySnapshot = (formattedDate: string) => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<DailyMissionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 내부 formatDate 호출 제거

  const fetchSnapshot = useCallback(async () => {
    if (!user || !formattedDate) { // formattedDate 유효성 검사 추가
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('*') // missions_snapshot, total_missions_count 등 포함
        .eq('user_id', user.id)
        // 파라미터로 받은 formattedDate 직접 사용
        .eq('date', formattedDate)
        .maybeSingle(); // 결과가 없거나 하나일 수 있음

      if (fetchError) throw fetchError;
      setSnapshot(data);
    } catch (err: unknown) {
      console.error('Error fetching daily snapshot:', err);
      setError('일일 스냅샷을 불러오는 중 오류가 발생했습니다.');
      // 에러 발생 시 스냅샷 상태를 null로 설정하는 것이 좋을 수 있음
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  // 의존성 배열에 user와 formattedDate 추가
  }, [user, formattedDate]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, loading, error, refetch: fetchSnapshot };
}; 