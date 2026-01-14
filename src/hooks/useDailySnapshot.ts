import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { DailyMissionSnapshot, Mission } from '../types'; // 타입 정의 필요

// 주어진 날짜가 속한 주의 월요일과 일요일을 계산하는 함수
const getWeekRange = (dateString: string): { monday: string; sunday: string } => {
  const date = new Date(dateString + 'T00:00:00Z');
  const dayOfWeek = date.getUTCDay();
  
  // 월요일 계산 (일요일=0이면 -6, 그 외는 1-dayOfWeek)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);
  
  // 일요일 계산 (월요일 + 6일)
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  
  return {
    monday: monday.toISOString().split('T')[0],
    sunday: sunday.toISOString().split('T')[0],
  };
};

// 파라미터 타입을 string으로 변경
export const useDailySnapshot = (formattedDate: string) => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<DailyMissionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 폴백으로 사용된 미션 목록 (같은 주의 다른 스냅샷에서 가져온 경우)
  const [fallbackMissions, setFallbackMissions] = useState<Mission[] | null>(null);
  // 해당 날짜의 총 미션 수 (스냅샷 또는 폴백에서 계산)
  const [totalMissionsCount, setTotalMissionsCount] = useState<number>(0);

  const fetchSnapshot = useCallback(async () => {
    if (!user || !formattedDate) {
      setSnapshot(null);
      setFallbackMissions(null);
      setTotalMissionsCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setFallbackMissions(null);
    setTotalMissionsCount(0);

    try {
      // 1. 먼저 해당 날짜의 스냅샷을 찾습니다
      const { data, error: fetchError } = await supabase
        .from('daily_mission_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', formattedDate)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      // 스냅샷이 있고 미션이 있으면 그대로 사용
      if (data && data.missions_snapshot && data.missions_snapshot.length > 0) {
        setSnapshot(data);
        setTotalMissionsCount(data.missions_snapshot.length);
        console.log(`[useDailySnapshot] 스냅샷에서 미션 수: ${data.missions_snapshot.length}`);
        return;
      }
      
      // 2. 스냅샷이 없거나 미션이 비어있으면 같은 주의 다른 스냅샷에서 미션 목록을 가져옵니다
      const { monday, sunday } = getWeekRange(formattedDate);
      console.log(`[useDailySnapshot] 해당 날짜(${formattedDate})에 스냅샷 없음, 같은 주(${monday} ~ ${sunday}) 스냅샷 검색`);
      
      const { data: weekSnapshots, error: weekError } = await supabase
        .from('daily_mission_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monday)
        .lte('date', sunday)
        .not('missions_snapshot', 'is', null)
        .order('date', { ascending: false })
        .limit(5);
      
      if (weekError) throw weekError;
      
      // 같은 주에 미션이 있는 스냅샷 찾기
      const validWeekSnapshot = weekSnapshots?.find(
        (s) => s.missions_snapshot && s.missions_snapshot.length > 0
      );
      
      if (validWeekSnapshot) {
        console.log(`[useDailySnapshot] 같은 주의 스냅샷(${validWeekSnapshot.date})에서 미션 목록 가져옴`);
        // 빈 스냅샷으로 설정 (해당 날짜에 실제 스냅샷은 없음)
        setSnapshot(data);
        // 폴백 미션 목록 설정
        setFallbackMissions(validWeekSnapshot.missions_snapshot);
        setTotalMissionsCount(validWeekSnapshot.missions_snapshot.length);
        console.log(`[useDailySnapshot] 폴백 미션 수: ${validWeekSnapshot.missions_snapshot.length}`);
      } else {
        // 같은 주에도 스냅샷이 없으면 현재 미션 목록을 가져옵니다
        console.log('[useDailySnapshot] 같은 주에 스냅샷 없음, 현재 미션 목록 사용');
        const { data: currentMissions, error: missionsError } = await supabase
          .from('missions')
          .select('*')
          .eq('user_id', user.id)
          .order('order', { ascending: true });
        
        if (missionsError) throw missionsError;
        
      setSnapshot(data);
        setFallbackMissions(currentMissions || []);
        setTotalMissionsCount(currentMissions?.length || 0);
        console.log(`[useDailySnapshot] 현재 미션 목록에서 미션 수: ${currentMissions?.length || 0}`);
      }
    } catch (err: unknown) {
      console.error('Error fetching daily snapshot:', err);
      setError('일일 스냅샷을 불러오는 중 오류가 발생했습니다.');
      setSnapshot(null);
      setFallbackMissions(null);
      setTotalMissionsCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, formattedDate]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { snapshot, loading, error, fallbackMissions, totalMissionsCount, refetch: fetchSnapshot };
}; 