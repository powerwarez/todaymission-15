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

  // 큐에서 배지 ID를 가져와 데이터를 로드하고 displayedBadges에 추가하는 로직
  useEffect(() => {
    // 처리 중이 아니고 큐에 항목이 있을 때만 실행
    if (!isProcessingQueue.current && notificationQueue.length > 0) {
      
      const processNextInQueue = async () => {
        // 다시 확인: 처리 중이거나 큐가 비었으면 중단
        if (isProcessingQueue.current || notificationQueue.length === 0) return;

        isProcessingQueue.current = true;
        setIsLoadingBadge(true);
        
        // 큐의 첫 번째 항목 처리
        const nextBadgeId = notificationQueue[0];
        console.log(`[StateHook] Processing queue, next ID: ${nextBadgeId}`);
        
        // 상태 업데이트: 큐에서 처리 시작한 ID 제거
        // 함수형 업데이트 사용 고려 (동시성 문제 방지)
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
           console.log('[StateHook] Finished processing ID:', nextBadgeId);
           
           // 중요: 처리가 끝난 후 즉시 다음 항목 처리 시도 (재귀 대신)
           // 약간의 지연을 주어 상태 업데이트가 반영될 시간을 확보
           setTimeout(() => {
                if(notificationQueue.length > 0) {
                    console.log("[StateHook] Triggering next process check after finishing one.");
                    // processNextInQueue(); // 직접 호출 대신 useEffect가 감지하도록 유도
                    // 혹은, 아래처럼 직접 호출하되, 시작 시 isProcessingQueue 체크 필수
                    if (!isProcessingQueue.current && notificationQueue.length > 0) {
                       processNextInQueue();
                    } else {
                        console.log("[StateHook] Skipping immediate next process call as queue might be empty or already processing.");
                    }
                }
           }, 50); 
        }
      };
      
      // 처리 시작
      processNextInQueue();
    }
    // notificationQueue 배열 자체가 변경될 때마다 실행
  }, [notificationQueue]); 

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