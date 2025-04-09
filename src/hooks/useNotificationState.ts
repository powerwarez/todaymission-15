import { useState, useCallback, useEffect, useRef } from 'react';
import { Badge } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useNotificationState = () => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);
  const [isLoadingBadge, setIsLoadingBadge] = useState(false);
  const isProcessingQueue = useRef(false);

  console.log('[StateHook] Running/Re-rendering. Queue:', notificationQueue, 'Current:', currentBadge);

  const processNextNotification = useCallback(async () => {
    if (isProcessingQueue.current || currentBadge || notificationQueue.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    setIsLoadingBadge(true);

    const nextBadgeId = notificationQueue[0];
    setNotificationQueue(prev => prev.slice(1));

    console.log(`[StateHook] Processing next notification: ${nextBadgeId}`);

    try {
      const { data: badgeData, error: fetchError } = await supabase
          .from('badges')
          .select('*')
          .eq('id', nextBadgeId)
          .single();

      if (fetchError) throw fetchError;

      if (badgeData) {
          console.log('[StateHook] Fetched badge data:', badgeData);
          setCurrentBadge(badgeData as Badge);
      } else {
          console.warn('[StateHook] Badge data not found for id:', nextBadgeId);
      }
    } catch (error) {
        console.error('[StateHook] Error fetching badge data:', error);
        isProcessingQueue.current = false;
    } finally {
       setIsLoadingBadge(false);
    }
  }, [notificationQueue, currentBadge]);

  const showBadgeNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] Queuing badgeId: ${badgeId}`);
    setNotificationQueue(prev => [...prev, badgeId]);
  }, []);

  const handleCloseNotification = useCallback(() => {
    console.log('[StateHook] handleCloseNotification called. Setting currentBadge to null.');
    setCurrentBadge(null);
    isProcessingQueue.current = false;
    
    setTimeout(() => {
      if (notificationQueue.length > 0) {
        console.log('[StateHook] Attempting to process next notification after close.');
        processNextNotification();
      }
    }, 300);
  }, [notificationQueue, processNextNotification]);

  useEffect(() => {
    if (!currentBadge && notificationQueue.length > 0 && !isProcessingQueue.current) {
        console.log('[StateHook useEffect] Triggering processNextNotification.');
        processNextNotification();
    }
    
    if (currentBadge === null) {
        console.log('[StateHook useEffect] Resetting isProcessingQueue flag.');
        isProcessingQueue.current = false;
    }
  }, [notificationQueue, currentBadge, processNextNotification]);

  return {
    currentBadge,
    handleCloseNotification,
    showBadgeNotification,
    isLoadingBadge,
  };
}; 