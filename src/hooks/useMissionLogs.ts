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
    // 필요한 상태 로드 전이면 실행 안 함
    if (!user || !formattedDate || totalCompletedCount === null || totalMissionsToday === null) {
        console.warn('[addLog] Required state not loaded yet.');
        return null;
    }

    // 현재 상태 기반으로 예측
    const currentTotalCount = totalCompletedCount;
    const currentCompletedToday = completedTodayCount;
    const newTotalCount = currentTotalCount + 1;
    const newCompletedToday = currentCompletedToday + 1;

    console.log('[addLog] Predicting badge status:', { currentTotalCount, currentCompletedToday, newTotalCount, newCompletedToday, totalMissionsToday });


    try {
      const todayKSTString = formattedDate;

      // 로그 존재 여부 확인 (기존 로직 유지)
      const { data: existingLog, error: checkError } = await supabase
        .from('mission_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingLog) {
         console.log('[useMissionLogs] Log already exists.');
         return null;
      }


      // 1. 로그 삽입 (check_challenges 트리거 실행)
      const { data, error: insertError } = await supabase
        .from('mission_logs')
        .insert({ user_id: user.id, mission_id: missionId, completed_at: todayKSTString })
        .select()
        .single();

      if (insertError) throw insertError;

      // --- 삽입 성공 시 클라이언트 상태 업데이트 및 배지 획득 예측 ---
      if (data) {
        // 상태 업데이트 먼저 수행
        setLogs((prev) => [...prev, data]);
        setTotalCompletedCount(newTotalCount); // 전체 카운트 증가
        setCompletedTodayCount(newCompletedToday); // 오늘 카운트 증가

        // 배지 획득 예측 로직
        const newlyEarnedBadgeIdsForNotification: string[] = [];

        // '첫 도전' 예측 (challenges 테이블의 실제 badge_id 사용 필요)
        const firstMissionBadgeId = 'first_mission_completed'; // challenges.badge_id 확인!
        if (newTotalCount === 1 && !previouslyEarnedBadgeIds.has(firstMissionBadgeId)) {
           newlyEarnedBadgeIdsForNotification.push(firstMissionBadgeId);
           // 상태 업데이트는 setLogs 다음에 한번에 처리하거나, 별도 effect로 관리 고려
           setPreviouslyEarnedBadgeIds(prev => new Set(prev).add(firstMissionBadgeId));
           console.log('🎉 Predicted new badge: 첫 도전');
        }

        // '열정 가득' 예측 (challenges 테이블의 실제 badge_id 사용 필요)
        const tenMissionsBadgeId = 'ten_missions_completed'; // challenges.badge_id 확인!
        if (newTotalCount === 10 && !previouslyEarnedBadgeIds.has(tenMissionsBadgeId)) {
           newlyEarnedBadgeIdsForNotification.push(tenMissionsBadgeId);
           setPreviouslyEarnedBadgeIds(prev => new Set(prev).add(tenMissionsBadgeId));
           console.log('🎉 Predicted new badge: 열정 가득');
        }

        // '오늘의 영웅' 예측 (challenges 테이블의 실제 badge_id 사용 필요)
        const dailyHeroBadgeId = 'daily_hero'; // challenges.badge_id 확인!
        // 오늘 완료 수가 총 미션 수 이상이고, 오늘 처음으로 이 조건을 만족했다면 알림
        if (totalMissionsToday > 0 && newCompletedToday >= totalMissionsToday && currentCompletedToday < totalMissionsToday) {
           newlyEarnedBadgeIdsForNotification.push(dailyHeroBadgeId);
           console.log('🎉 Predicted new badge: 오늘의 영웅');
        }

        // 알림 표시
        if (newlyEarnedBadgeIdsForNotification.length > 0) {
            console.log(`🔔 Showing notifications for earned badges: ${newlyEarnedBadgeIdsForNotification.join(', ')}`);
            
            // 중요: 역순으로 추가하여 첫 번째 배지가 먼저 표시되도록 함
            // (큐는 FIFO 방식으로 처리되므로 마지막에 추가된 항목이 나중에 처리됨)
            [...newlyEarnedBadgeIdsForNotification].reverse().forEach(badgeId => {
              console.log(`🔔 Queueing badge notification: ${badgeId}`);
              showBadgeNotification(badgeId);
            });
        }

        // 스냅샷 카운트 증가는 DB 정합성을 위해 계속 호출
        const { error: incrementError } = await supabase.rpc('increment_completed_count', {
            snapshot_user_id: user.id,
            snapshot_date: todayKSTString
        });
        if (incrementError) {
            console.error('Error incrementing snapshot count:', incrementError);
        }

        playSound('/sound/high_rune.flac'); // 오디오는 계속 시도

        return data;
      }
      return null;
    } catch (err: unknown) {
      console.error('Error adding mission log:', err);
      setError('미션 기록 추가 중 오류가 발생했습니다.');
      // 실패 시 예측했던 상태 롤백 필요 (선택적)
      // setTotalCompletedCount(currentTotalCount);
      // setCompletedTodayCount(currentCompletedToday);
      return null;
    }
  };

  // deleteLog 함수 - 상태 업데이트 로직 추가
  const deleteLog = async (missionId: string) => {
    if (!user || !formattedDate || totalCompletedCount === null) return; // 상태 로드 확인
    try {
      const todayKSTString = formattedDate;
      // 현재 상태 저장 (롤백 대비)
      const currentTotalCount = totalCompletedCount;
      const currentCompletedToday = completedTodayCount;

      // 1. DB에서 로그 삭제
      const { error: deleteError } = await supabase
        .from('mission_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('mission_id', missionId)
        .eq('completed_at', todayKSTString);

      if (deleteError) throw deleteError;

      // --- 삭제 성공 시 클라이언트 상태 업데이트 ---
      setLogs((prev) => prev.filter((log) => log.mission_id !== missionId));
      // 카운트 감소 예측 업데이트
      setTotalCompletedCount(currentTotalCount - 1);
      setCompletedTodayCount(currentCompletedToday - 1);

      // 2. 스냅샷 카운트 감소
      const { error: decrementError } = await supabase.rpc('decrement_completed_count', {
          snapshot_user_id: user.id,
          snapshot_date: todayKSTString
      });
       if (decrementError) {
          console.error('Error decrementing snapshot count:', decrementError);
          // 실패 시 상태 롤백 고려
          // setTotalCompletedCount(currentTotalCount);
          // setCompletedTodayCount(currentCompletedToday);
      }

    } catch (err: unknown) {
      console.error('Error deleting mission log:', err);
      setError('미션 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
}; 