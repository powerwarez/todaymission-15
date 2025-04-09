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
  // 각 배지별 닫기 타임아웃 관리용 Ref 제거
  // const closeTimeoutRefs = useRef<Map<string, number>>(new Map());

  console.log('[StateHook] Running/Re-rendering. Queue:', notificationQueue, 'Displayed:', displayedBadges.map(b => b.id));

  // 큐에서 다음 항목 처리 함수
  const processNextInQueue = useCallback(async () => {
    // 다시 확인: 처리 중이거나 큐가 비었으면 중단
    if (isProcessingQueue.current || notificationQueue.length === 0) {
        console.log("[StateHook processNextInQueue] Skipping: Already processing or queue empty.");
        return;
    }

    isProcessingQueue.current = true;
    setIsLoadingBadge(true);
    
    // 큐의 첫 번째 항목 처리
    const nextBadgeId = notificationQueue[0];
    console.log(`[StateHook] Processing queue, next ID: ${nextBadgeId}`);
    
    // 상태 업데이트: 큐에서 처리 시작한 ID 제거 (함수형 업데이트)
    setNotificationQueue(prevQueue => prevQueue.slice(1));

    try {
      const { data: badgeData, error: fetchError } = await supabase
          .from('badges')
          .select('*')
          .eq('id', nextBadgeId)
          .single();

      if (fetchError) throw fetchError;

      if (badgeData) {
        console.log('[StateHook] Fetched badge data, adding to displayedBadges:', badgeData.id);
        // 함수형 업데이트: 최신 상태 기반으로 추가
        setDisplayedBadges(prevBadges => {
          // 이미 표시된 배지가 아닌 경우에만 추가
          if (!prevBadges.some(b => b.id === badgeData.id)) {
            return [...prevBadges, badgeData as Badge];
          }
          return prevBadges; // 중복이면 변경 없음
        });
      } else {
        console.warn('[StateHook] Badge data not found for id:', nextBadgeId);
      }
    } catch (error) {
        console.error('[StateHook] Error fetching badge data:', error);
    } finally {
       setIsLoadingBadge(false);
       // 처리가 끝났으므로 플래그 리셋
       isProcessingQueue.current = false;
       console.log('[StateHook] Finished processing ID:', nextBadgeId, 'Reset processing flag.');
       
       // finally 블록 내에서 다음 처리 시작 로직 제거
       // 다음 처리는 useEffect가 notificationQueue 변경 + isProcessingQueue 상태를 보고 트리거
    }
  }, [notificationQueue]); // notificationQueue가 변경될 때 이 함수 자체는 재생성되지만, 호출은 useEffect가 관리

  // 큐 상태 변경 감지 및 처리 시작
  useEffect(() => {
    console.log(`[StateHook useEffect Check] Queue Length: ${notificationQueue.length}, Processing: ${isProcessingQueue.current}`);
    // 처리 중이 아니고 큐에 항목이 있을 때만 처리 시작
    if (!isProcessingQueue.current && notificationQueue.length > 0) {
      console.log("[StateHook useEffect] Triggering processNextInQueue.");
      processNextInQueue();
    } else {
       console.log("[StateHook useEffect] Conditions not met, not triggering process.");
    }
    // processNextInQueue 함수가 notificationQueue에 의존하므로, notificationQueue가 변경되면
    // processNextInQueue 함수도 변경되고, 이 useEffect도 다시 실행됨.
    // isProcessingQueue.current는 ref이므로 의존성 배열에 넣지 않아도 됨.
  }, [notificationQueue, processNextInQueue]); 

  const showBadgeNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] Queuing badgeId: ${badgeId}`);
    // 큐에 중복 ID가 없으면 추가 (함수형 업데이트)
    setNotificationQueue(prevQueue => {
      if (!prevQueue.includes(badgeId)) {
        return [...prevQueue, badgeId];
      }
      return prevQueue;
    });
  }, []);

  // 특정 배지 알림을 닫는 함수 (ID 필요)
  const handleCloseNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] handleCloseNotification called for badge: ${badgeId}. Removing from displayedBadges`);
    
    // closeTimeoutRefs 관련 로직 제거
    
    // displayedBadges 배열에서 해당 배지 제거 (함수형 업데이트)
    setDisplayedBadges(prevBadges => prevBadges.filter(badge => badge.id !== badgeId));
    
  }, []);

  // 컴포넌트 언마운트 시 모든 타임아웃 정리 (이제 모달 자체에서 하므로 제거)
  /*
  useEffect(() => {
    return () => {
      closeTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      closeTimeoutRefs.current.clear();
    };
  }, []);
  */

  return {
    displayedBadges, 
    handleCloseNotification, 
    showBadgeNotification,
    isLoadingBadge, 
    notificationQueue, 
    // closeTimeoutRefs 제거
  };
}; 