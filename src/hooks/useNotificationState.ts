import { useState, useCallback, useEffect, useRef } from 'react';
import { Badge } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useNotificationState = () => {
  // 현재 화면에 표시될 배지 목록 상태
  const [displayedBadges, setDisplayedBadges] = useState<Badge[]>([]);
  // 가져올 배지 ID 큐
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);
  const [isLoadingBadge, setIsLoadingBadge] = useState(false);
  const isProcessingQueue = useRef(false);
  // 각 배지별 닫기 타임아웃 관리용 Ref (Map 사용)
  const closeTimeoutRefs = useRef<Map<string, number>>(new Map());

  console.log('[StateHook] Running/Re-rendering. Queue:', notificationQueue, 'Displayed:', displayedBadges.map(b => b.id));

  // 큐에서 배지 ID를 가져와 데이터를 로드하고 displayedBadges에 추가하는 로직
  useEffect(() => {
    if (isProcessingQueue.current || notificationQueue.length === 0) {
      return; // 처리 중이거나 큐가 비었으면 실행 안 함
    }

    const processQueue = async () => {
      isProcessingQueue.current = true;
      setIsLoadingBadge(true);

      const nextBadgeId = notificationQueue[0];
      console.log(`[StateHook] Processing queue, next ID: ${nextBadgeId}`);
      
      // 큐에서 ID 제거 (즉시 제거)
      setNotificationQueue(prev => prev.slice(1));

      try {
        const { data: badgeData, error: fetchError } = await supabase
            .from('badges')
            .select('*')
            .eq('id', nextBadgeId)
            .single();

        if (fetchError) throw fetchError;

        if (badgeData) {
          console.log('[StateHook] Fetched badge data, adding to displayedBadges:', badgeData.id);
          // 이미 표시된 배지가 아닌 경우에만 추가 (중복 방지)
          setDisplayedBadges(prev => {
            if (!prev.some(b => b.id === badgeData.id)) {
              return [...prev, badgeData as Badge];
            }
            return prev;
          });
        } else {
          console.warn('[StateHook] Badge data not found for id:', nextBadgeId);
        }
      } catch (error) {
          console.error('[StateHook] Error fetching badge data:', error);
      } finally {
         setIsLoadingBadge(false);
         isProcessingQueue.current = false;
         console.log('[StateHook] Finished processing ID:', nextBadgeId);
         
         // 큐에 남은 항목이 있으면 즉시 다음 처리 시작 (재귀적 호출 대신)
         if (notificationQueue.length > 1) { // slice(1) 했으므로 1 초과인지 확인
            console.log('[StateHook] More items in queue, triggering next process soon.');
            setTimeout(processQueue, 50); // 약간의 지연 후 다음 처리
         }
      }
    };

    processQueue();

  }, [notificationQueue]); // notificationQueue 변경 시 실행

  const showBadgeNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] Queuing badgeId: ${badgeId}`);
    // 큐에 중복 ID가 없으면 추가
    setNotificationQueue(prev => {
      if (!prev.includes(badgeId)) {
        return [...prev, badgeId];
      }
      return prev;
    });
  }, []);

  // 특정 배지 알림을 닫는 함수 (ID 필요)
  const handleCloseNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] handleCloseNotification called for badge: ${badgeId}. Removing from displayedBadges`);
    
    // 해당 배지 ID의 타임아웃 정리
    const timeoutId = closeTimeoutRefs.current.get(badgeId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      closeTimeoutRefs.current.delete(badgeId);
    }
    
    // displayedBadges 배열에서 해당 배지 제거
    setDisplayedBadges(prev => prev.filter(badge => badge.id !== badgeId));
    
  }, []);

  // 컴포넌트 언마운트 시 모든 타임아웃 정리
  useEffect(() => {
    return () => {
      closeTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      closeTimeoutRefs.current.clear();
    };
  }, []);

  return {
    displayedBadges, // 이름 변경: currentBadge -> displayedBadges
    handleCloseNotification, // 이제 badgeId를 인자로 받음
    showBadgeNotification,
    isLoadingBadge, 
    notificationQueue, // App.tsx에서 로딩 상태 표시 등에 사용 가능
    closeTimeoutRefs // 각 모달 인스턴스에서 타임아웃 설정 시 필요
  };
}; 