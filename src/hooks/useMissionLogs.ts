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

  // 오늘 완료된 로그 수 상태 추가 (예측용)
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  // 전체 완료 로그 수 상태 추가 (예측용)
  const [totalCompletedCount, setTotalCompletedCount] = useState<number | null>(null);
  // 오늘 필요한 총 미션 수 상태 추가 (예측용)
  const [totalMissionsToday, setTotalMissionsToday] = useState<number | null>(null);
  // 이전에 획득한 배지 ID 목록 상태 추가 (예측용, Set 사용) - 최초 획득 확인용
  const [previouslyEarnedBadgeIds, setPreviouslyEarnedBadgeIds] = useState<Set<string>>(new Set());

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

  // 데이터 로딩 시 관련 상태 업데이트
  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    console.log('[useMissionLogs] Fetching initial data for badge prediction...');
    setLoading(true); // 로딩 시작
    setError(null);
    try {
      // Fetch logs for the specific date to get initial completedTodayCount
      const { data: logsData, error: logsError } = await supabase
        .from('mission_logs')
        .select('*') // count만 필요하므로 id만 가져옴
        .eq('user_id', user.id)
        .eq('completed_at', formattedDate);

      if (logsError) throw logsError;
      const initialLogs = logsData || [];
      setLogs(initialLogs); // 기존 로그 상태 설정
      setCompletedTodayCount(initialLogs.length); // 오늘 완료 개수 초기화
      console.log(`[useMissionLogs] Initial completedTodayCount: ${initialLogs.length}`);

      // Fetch total mission count for today
      // 이 값은 자주 변하지 않으므로 별도 훅이나 컨텍스트에서 관리하는 것이 더 효율적일 수 있음
      const { count: missionsCount, error: missionsError } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (missionsError) throw missionsError;
      setTotalMissionsToday(missionsCount ?? 0);
      console.log(`[useMissionLogs] Initial totalMissionsToday: ${missionsCount}`);


      // Fetch total completed count (all time)
      const { count: totalCount, error: totalCountError } = await supabase
        .from('mission_logs')
        .select('id', { count: 'exact', head: true }) // count만 가져옴
        .eq('user_id', user.id);

      if (totalCountError) throw totalCountError;
      setTotalCompletedCount(totalCount ?? 0);
      console.log(`[useMissionLogs] Initial totalCompletedCount: ${totalCount}`);


      // Fetch previously earned one-time badges ('첫 도전', '열정 가득')
      // 실제 badge_id는 challenges 테이블 확인 후 정확히 기입해야 함
      const oneTimeBadgeIds = ['first_mission_completed', 'ten_missions_completed']; // 예시 ID
      const { data: earnedBadgesData, error: earnedBadgesError } = await supabase
        .from('earned_badges')
        .select('badge_id')
        .eq('user_id', user.id)
        .in('badge_id', oneTimeBadgeIds);

      if (earnedBadgesError) throw earnedBadgesError;
      const earnedSet = new Set(earnedBadgesData?.map(b => b.badge_id) || []);
      setPreviouslyEarnedBadgeIds(earnedSet);
      console.log('[useMissionLogs] Initial previouslyEarnedBadgeIds:', earnedSet);


    } catch (err: unknown) {
      console.error('Error fetching initial data for badge prediction:', err);
      setError('초기 데이터 로딩 중 오류 발생');
    } finally {
       setLoading(false); // 초기 데이터 로딩 완료
    }
  }, [user, formattedDate]);

  // 컴포넌트 마운트 또는 사용자/날짜 변경 시 초기 데이터 로드
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const addLog = async (missionId: string): Promise<MissionLog | null> => {
    if (!user || !formattedDate) {
        console.warn('[addLog] User or formattedDate not available.');
        return null;
    }

    // 상태 로드 확인 (다른 상태는 함수 내부에서 가져옴)
    if (totalMissionsToday === null) {
        console.warn('[addLog] totalMissionsToday state not loaded yet.');
        return null;
    }

    // 상태 예측 로직을 제거하고, 상태 업데이트 후 조건 확인

    try {
      const todayKSTString = formattedDate;

      // 로그 존재 여부 확인
      const { error: checkError, count: existingLogCount } = await supabase
        .from('mission_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString);

      if (checkError) throw checkError;
      // count를 사용하여 로그 존재 여부 확인
      if (existingLogCount && existingLogCount > 0) {
         console.log('[useMissionLogs] Log already exists.');
         return null;
      }

      // 1. 로그 삽입
      const { data: insertedLog, error: insertError } = await supabase
        .from('mission_logs')
        .insert({ user_id: user.id, mission_id: missionId, completed_at: todayKSTString })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedLog) return null;

      // --- 삽입 성공 시 상태 업데이트 (함수형 업데이트 사용) ---
      const earnedBadgeIds: string[] = []; // 획득한 배지 ID 저장 (const로 변경)
      
      setLogs((prevLogs) => [...prevLogs, insertedLog]);
      
      // 오늘 완료 카운트 업데이트 및 배지 확인
      setCompletedTodayCount(prevCount => {
          const newCompletedToday = prevCount + 1;
          const currentCompletedToday = prevCount; // 업데이트 전 값
          console.log('[addLog setCompletedTodayCount] Updated:', newCompletedToday, 'Previous:', currentCompletedToday, 'Total needed:', totalMissionsToday);
          
          // '오늘의 영웅' 예측 (상태 업데이트 *후* 확인)
          const dailyHeroBadgeId = 'daily_hero';
          if (totalMissionsToday > 0 && newCompletedToday >= totalMissionsToday && currentCompletedToday < totalMissionsToday) {
             console.log('🎉 Condition met for badge: 오늘의 영웅');
             earnedBadgeIds.push(dailyHeroBadgeId);
          }
          return newCompletedToday;
      });

      // 전체 완료 카운트 업데이트 및 배지 확인
      setTotalCompletedCount(prevCount => {
          if (prevCount === null) return 0; // 초기값 처리
          const newTotalCount = prevCount + 1;
          console.log('[addLog setTotalCompletedCount] Updated:', newTotalCount, 'Previous:', prevCount);

          // '첫 도전' 예측
          const firstMissionBadgeId = 'first_mission_completed';
          if (newTotalCount === 1 && !previouslyEarnedBadgeIds.has(firstMissionBadgeId)) {
             console.log('🎉 Condition met for badge: 첫 도전');
             earnedBadgeIds.push(firstMissionBadgeId);
             setPreviouslyEarnedBadgeIds(prevSet => new Set(prevSet).add(firstMissionBadgeId));
          }

          // '열정 가득' 예측
          const tenMissionsBadgeId = 'ten_missions_completed';
          if (newTotalCount === 10 && !previouslyEarnedBadgeIds.has(tenMissionsBadgeId)) {
             console.log('🎉 Condition met for badge: 열정 가득');
             earnedBadgeIds.push(tenMissionsBadgeId);
             setPreviouslyEarnedBadgeIds(prevSet => new Set(prevSet).add(tenMissionsBadgeId));
          }
          return newTotalCount;
      });

      // 상태 업데이트가 반영된 후 (약간의 지연) 알림 표시
      // 중요: earnedBadgeIds 배열은 클로저 문제로 인해 여기서 직접 사용
      setTimeout(() => {
          if (earnedBadgeIds.length > 0) {
              console.log(`🔔 Showing notifications for earned badges: ${earnedBadgeIds.join(', ')}`);
              for (const badgeId of earnedBadgeIds) {
                  console.log(`🔔 Queueing badge notification: ${badgeId} (${badgeId === 'ten_missions_completed' ? '열정가득' : badgeId === 'daily_hero' ? '오늘의 영웅' : '첫 도전'})`);
                  showBadgeNotification(badgeId);
              }
          }
      }, 100); // 상태 업데이트 반영될 시간 확보

      // 스냅샷 카운트 증가 RPC 호출
      const { error: incrementError } = await supabase.rpc('increment_completed_count', {
          snapshot_user_id: user.id,
          snapshot_date: todayKSTString
      });
      if (incrementError) {
          console.error('Error incrementing snapshot count:', incrementError);
      }

      playSound('/sound/high_rune.flac'); 

      return insertedLog;

    } catch (err: unknown) {
      console.error('Error adding mission log:', err);
      setError('미션 기록 추가 중 오류가 발생했습니다.');
      return null;
    }
  };

  // deleteLog 함수 - 상태 업데이트 로직 추가 (함수형 업데이트 사용)
  const deleteLog = async (missionId: string) => {
    if (!user || !formattedDate) return;
    try {
      const todayKSTString = formattedDate;

      // 1. DB에서 로그 삭제
      const { error: deleteError } = await supabase
        .from('mission_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString);

      if (deleteError) throw deleteError;

      // --- 삭제 성공 시 클라이언트 상태 업데이트 (함수형 업데이트) ---
      setLogs((prevLogs) => prevLogs.filter((log) => log.mission_id !== missionId));
      
      // 카운트 감소 (null 체크 및 0 미만 방지)
      setTotalCompletedCount(prevCount => Math.max(0, (prevCount ?? 0) - 1));
      setCompletedTodayCount(prevCount => Math.max(0, prevCount - 1));
      
      console.log('[deleteLog] States updated after deletion.');

      // 2. 스냅샷 카운트 감소
      const { error: decrementError } = await supabase.rpc('decrement_completed_count', {
          snapshot_user_id: user.id,
          snapshot_date: todayKSTString
      });
       if (decrementError) {
          console.error('Error decrementing snapshot count:', decrementError);
      }

    } catch (err: unknown) {
      console.error('Error deleting mission log:', err);
      setError('미션 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
}; 