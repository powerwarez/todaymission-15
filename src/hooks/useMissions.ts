import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Mission } from '../types';

export const useMissions = () => {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    if (!user) return;
    console.log('[useMissions] Fetching missions...');
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (fetchError) throw fetchError;
      setMissions(data || []);
    } catch (err: unknown) {
      console.error('Error fetching missions:', err);
      setError('미션을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const addMission = async (missionData: { content: string; order: number }): Promise<Mission | null> => {
    if (!user) return null;
    try {
      const { data, error: insertError } = await supabase
        .from('missions')
        .insert({ user_id: user.id, content: missionData.content, order: missionData.order })
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) {
        setMissions((prev) => [...prev, data].sort((a, b) => a.order - b.order));
        return data;
      }
      return null;
    } catch (err: unknown) {
      console.error('Error adding mission:', err);
      setError('미션 추가 중 오류가 발생했습니다.');
      return null;
    }
  };

  const updateMission = async (id: string, updates: Partial<Omit<Mission, 'id' | 'user_id' | 'created_at'>>) => {
     if (!user) return;
    try {
      const { error: updateError } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      setMissions((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...updates } : m)).sort((a, b) => a.order - b.order)
      );
    } catch (err: unknown) {
      console.error('Error updating mission:', err);
      setError('미션 수정 중 오류가 발생했습니다.');
    }
  };

 const deleteMission = async (id: string) => {
     if (!user) return;
    try {
      const { error: deleteError } = await supabase
        .from('missions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setMissions((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      console.error('Error deleting mission:', err);
      setError('미션 삭제 중 오류가 발생했습니다.');
    }
  };

  return { missions, loading, error, fetchMissions, addMission, updateMission, deleteMission, setMissions };
}; 