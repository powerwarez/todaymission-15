import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { MissionLog } from '../types';

// 오디오 재생 함수
const playSound = (soundFile: string) => {
  const audio = new Audio(soundFile);
  audio.load();
  audio.play().catch(e => console.error("Error playing sound:", e));
};

export const useMissionLogs = (formattedDate: string) => {
  const { user } = useAuth();
  const { showBadgeNotification } = useNotification();
  const [logs, setLogs] = useState<MissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user || !formattedDate) {
      setLogs([]);
      setLoading(false);
      return;
    }
    console.log('[useMissionLogs] Fetching logs for date:', formattedDate);
    setLoading(true);
    setError(null);
    try {
      // completed_at 이 date 타입이라고 가정하고 단순 비교
      const { data, error: fetchError } = await supabase
        .from('mission_logs') // 테이블 이름 확인 필요
        .select('*')
        .eq('user_id', user.id)
        .eq('completed_at', formattedDate);

      // 만약 completed_at 이 timestamptz 라면 아래 범위 쿼리 사용
      /*
      // KST 기준 시작 시각 (00:00:00)과 종료 시각 (다음 날 00:00:00) 계산
      const startOfDayKST = toZonedTime(`${formattedDate}T00:00:00`, timeZone).toISOString(); // toZonedTime 사용 예시 (주의: toZonedTime은 Date 객체 반환 안 함)
      const nextDay = new Date(new Date(formattedDate + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000);
      const endOfDayKST = toZonedTime(`${nextDay.toISOString().split('T')[0]}T00:00:00`, timeZone).toISOString();

      console.log('[useMissionLogs] Query range (timestamptz):', startOfDayKST, endOfDayKST);

      const { data, error: fetchError } = await supabase
        .from('mission_logs') // 테이블 이름 확인 필요
        .select('*')
        .eq('user_id', user.id)
        // completed_at 필터링: KST 기준 하루 범위
        .gte('completed_at', startOfDayKST)
        .lt('completed_at', endOfDayKST);
      */

      if (fetchError) throw fetchError;
      console.log('[useMissionLogs] Fetched logs:', data);
      setLogs(data || []);
    } catch (err: unknown) {
      console.error('Error fetching mission logs:', err);
      setError('미션 기록을 불러오는 중 오류가 발생했습니다.');
      setLogs([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, [user, formattedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // addLog 함수 수정 (completed_at 이 date 타입 가정)
  const addLog = async (missionId: string): Promise<MissionLog | null> => {
    if (!user || !formattedDate) return null;
    try {
      const todayKSTString = formattedDate;

      const { data: existingLog, error: checkError } = await supabase
        .from('mission_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingLog) {
         console.log('[useMissionLogs] Log already exists for mission:', missionId, 'on date:', todayKSTString);
         return null;
      }

      const { data, error: insertError } = await supabase
        .from('mission_logs')
        .insert({ user_id: user.id, mission_id: missionId, completed_at: todayKSTString })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        const { error: incrementError } = await supabase.rpc('increment_completed_count', {
            snapshot_user_id: user.id,
            snapshot_date: todayKSTString
        });
        if (incrementError) {
            console.error('Error incrementing snapshot count:', incrementError);
        }

        setLogs((prev) => [...prev, data]);
        playSound('/sound/high_rune.flac');

        // 3. 배지 획득 여부 확인 및 알림 (새로운 RPC 호출)
        try {
          console.log('[useMissionLogs] Calling check_if_daily_hero_earned_today RPC...');
          const { data: wasEarnedToday, error: badgeCheckError } = await supabase.rpc(
              'check_if_daily_hero_earned_today',
              { p_user_id: user.id, p_check_date: todayKSTString } // KST 날짜 전달
          );
          console.log('[useMissionLogs] RPC Result - wasEarnedToday:', wasEarnedToday, 'badgeCheckError:', badgeCheckError);

          if (badgeCheckError) {
              console.error('Error checking if daily hero earned today:', badgeCheckError);
          } else if (wasEarnedToday === true) {
              console.log('🎉 Daily hero badge earned today!');
              // 'daily_hero' 배지 ID를 challenges 테이블에서 확인하고 정확히 사용해야 함
              showBadgeNotification('daily_hero');
          }
        } catch(badgeError) {
           console.error('Failed to call badge check RPC:', badgeError);
        }

        return data;
      }
      return null;
    } catch (err: unknown) {
      console.error('Error adding mission log:', err);
      setError('미션 기록 추가 중 오류가 발생했습니다.');
      return null;
    }
  };

  // deleteLog 함수 수정 (completed_at 이 date 타입 가정)
  const deleteLog = async (missionId: string) => {
    if (!user || !formattedDate) return;
    try {
      const todayKSTString = formattedDate;

      const { error: deleteError } = await supabase
        .from('mission_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString);

      if (deleteError) throw deleteError;

      const { error: decrementError } = await supabase.rpc('decrement_completed_count', {
          snapshot_user_id: user.id,
          snapshot_date: todayKSTString
      });
      if (decrementError) {
          console.error('Error decrementing snapshot count:', decrementError);
      }

      setLogs((prev) => prev.filter((log) => log.mission_id !== missionId));
    } catch (err: unknown) {
      console.error('Error deleting mission log:', err);
      setError('미션 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
}; 