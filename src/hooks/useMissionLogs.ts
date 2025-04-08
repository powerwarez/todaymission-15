import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { MissionLog } from '../types';

// 오디오 재생 함수
const playSound = (soundFile: string) => {
  const audio = new Audio(soundFile);
  audio.play().catch(e => console.error("Error playing sound:", e));
};

// 날짜를 YYYY-MM-DD 형식의 문자열로 포맷하는 헬퍼 함수
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const useMissionLogs = (date: Date) => {
  const { user } = useAuth();
  const { showBadgeNotification } = useNotification();
  const [logs, setLogs] = useState<MissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedDate = formatDate(date); // YYYY-MM-DD

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('mission_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed_at', formattedDate);

      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err: unknown) {
      console.error('Error fetching mission logs:', err);
      setError('미션 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, formattedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addLog = async (missionId: string): Promise<MissionLog | null> => {
    if (!user) return null;
    try {
      // Check if log already exists for this mission on this date
      const { data: existingLog, error: checkError } = await supabase
        .from('mission_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', formattedDate)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 result without error

      if (checkError) throw checkError;
      if (existingLog) return null; // Already logged

      // 1. Insert the log
      const { data, error: insertError } = await supabase
        .from('mission_logs')
        .insert({ user_id: user.id, mission_id: missionId, completed_at: formattedDate })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. If insert successful, increment snapshot count
      if (data) {
        const { error: incrementError } = await supabase.rpc('increment_completed_count', {
            snapshot_user_id: user.id,
            snapshot_date: formattedDate
        });
        if (incrementError) {
            console.error('Error incrementing snapshot count:', incrementError);
            // 카운트 증가 실패 시 롤백은 복잡하므로 일단 로그만 남김
        }

        setLogs((prev) => [...prev, data]);
        playSound('/sound/high_rune.flac'); // 성공 시 사운드 재생

        // 3. Check and award badge if all missions for the day are complete
        try {
            const { data: badgeAwarded, error: badgeCheckError } = await supabase.rpc(
                'check_and_award_all_missions_badge',
                { check_user_id: user.id, check_date: formattedDate }
            );

            if (badgeCheckError) {
                console.error('Error checking/awarding badge:', badgeCheckError);
            } else if (badgeAwarded === true) {
                console.log('🎉 Badge awarded: all_missions_today!');
                showBadgeNotification('all_missions_today');
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

  const deleteLog = async (missionId: string) => {
    if (!user) return;
    try {
      // 1. Delete the log
      const { error: deleteError } = await supabase
        .from('mission_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', formattedDate);

      if (deleteError) throw deleteError;

      // 2. If delete successful, decrement snapshot count
      const { error: decrementError } = await supabase.rpc('decrement_completed_count', {
          snapshot_user_id: user.id,
          snapshot_date: formattedDate
      });
      if (decrementError) {
          console.error('Error decrementing snapshot count:', decrementError);
          // 카운트 감소 실패 시 처리 (선택적)
      }

      setLogs((prev) => prev.filter((log) => log.mission_id !== missionId));
    } catch (err: unknown) {
      console.error('Error deleting mission log:', err);
      setError('미션 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
}; 