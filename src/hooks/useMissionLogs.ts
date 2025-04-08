import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
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

      const { data, error: insertError } = await supabase
        .from('mission_logs')
        .insert({ user_id: user.id, mission_id: missionId, completed_at: formattedDate })
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) {
        setLogs((prev) => [...prev, data]);
        playSound('/sound/high_rune.flac'); // 성공 시 사운드 재생
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
      const { error: deleteError } = await supabase
        .from('mission_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', formattedDate);

      if (deleteError) throw deleteError;
      setLogs((prev) => prev.filter((log) => log.mission_id !== missionId));
    } catch (err: unknown) {
      console.error('Error deleting mission log:', err);
      setError('미션 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
}; 