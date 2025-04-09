import { useState, useCallback, useEffect, useRef } from 'react';
import { Badge } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useNotificationState = () => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);
  const [isLoadingBadge, setIsLoadingBadge] = useState(false);
  const isProcessingQueue = useRef(false);
  const closeTimeoutRef = useRef<number | undefined>(undefined); // 닫기 타임아웃 관리용

  console.log('[StateHook] Running/Re-rendering. Queue:', notificationQueue, 'Current:', currentBadge ? currentBadge.id : 'null');

  // 다음 배지 처리
  const processNextNotification = useCallback(async () => {
    // 이미 처리 중이거나, 현재 배지가 있거나, 큐가 비어있으면 처리 안함
    if (isProcessingQueue.current || currentBadge !== null || notificationQueue.length === 0) {
      console.log('[StateHook] Skipping processNextNotification.',
        isProcessingQueue.current ? '- Already processing' : '',
        currentBadge ? '- Badge already displayed' : '',
        notificationQueue.length === 0 ? '- Empty queue' : '');
      return;
    }

    isProcessingQueue.current = true;
    console.log('[StateHook] Processing next notification, setting isLoading to true');
    setIsLoadingBadge(true);

    // 큐에서 다음 배지 ID 가져오기 (복사 후 상태 업데이트)
    const nextBadgeId = notificationQueue[0];
    setNotificationQueue(prev => prev.slice(1));

    console.log(`[StateHook] Fetching badge data for: ${nextBadgeId}`);

    try {
      const { data: badgeData, error: fetchError } = await supabase
          .from('badges')
          .select('*')
          .eq('id', nextBadgeId)
          .single();

      if (fetchError) throw fetchError;

      if (badgeData) {
          console.log('[StateHook] Setting currentBadge with data:', badgeData.id);
          setCurrentBadge(badgeData as Badge);
      } else {
          console.warn('[StateHook] Badge data not found for id:', nextBadgeId);
          // 데이터 없으면 처리 완료 표시
          isProcessingQueue.current = false;
      }
    } catch (error) {
        console.error('[StateHook] Error fetching badge data:', error);
        isProcessingQueue.current = false;
    } finally {
       setIsLoadingBadge(false);
       console.log('[StateHook] Badge loading completed, isLoading set to false');
    }
  }, [notificationQueue, currentBadge]);

  const showBadgeNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] Queuing badgeId: ${badgeId}`);
    setNotificationQueue(prev => [...prev, badgeId]);
  }, []);

  const handleCloseNotification = useCallback(() => {
    console.log('[StateHook] handleCloseNotification called. Setting currentBadge to null');
    
    // 기존 타임아웃 정리
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = undefined;
    }
    
    // 현재 배지 즉시 제거 (모달 닫힘)
    setCurrentBadge(null);
    
    // 다음 배지 처리를 위한 타임아웃 설정 (애니메이션 완료 후)
    closeTimeoutRef.current = window.setTimeout(() => {
      console.log('[StateHook] Close animation finished, resetting processing flag');
      isProcessingQueue.current = false;
      
      // 타임아웃 안에서 다음 알림 체크/처리
      if (notificationQueue.length > 0) {
        console.log('[StateHook] Queue not empty, processing next notification');
        processNextNotification();
      }
    }, 500); // 모달 애니메이션(300ms) + 약간의 여유(200ms)
  }, [notificationQueue, processNextNotification]);

  // 큐 업데이트 감지하여 처리 시작
  useEffect(() => {
    // 현재 표시 중인 배지가 없고, 큐에 항목이 있으며, 처리 중이 아닐 때 다음 알림 처리
    if (currentBadge === null && notificationQueue.length > 0 && !isProcessingQueue.current) {
      console.log('[StateHook useEffect] Conditions met, triggering processNextNotification');
      processNextNotification();
    }
  }, [notificationQueue, currentBadge, processNextNotification]);

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentBadge,
    handleCloseNotification,
    showBadgeNotification,
    isLoadingBadge,
  };
}; 