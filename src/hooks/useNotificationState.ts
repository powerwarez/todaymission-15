import { useState, useCallback } from 'react';
import { Badge } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useNotificationState = () => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);

  // 이 훅은 App 레벨에서 사용될 것이므로, DB 접근 로직을 포함합니다.
  const showBadgeNotification = useCallback(async (badgeId: string) => {
    console.log('Hook: Attempting to show notification for badge:', badgeId);
    try {
        const { data: badgeData, error: fetchError } = await supabase
            .from('badges')
            .select('*')
            .eq('id', badgeId)
            .single();

        if (fetchError) throw fetchError;

        if (badgeData) {
            console.log('Hook: Fetched badge data:', badgeData);
            setCurrentBadge(badgeData as Badge);
        } else {
            console.warn('Hook: Badge data not found for id:', badgeId);
        }
    } catch (error) {
        console.error('Hook: Error fetching badge data for notification:', error);
    }
  }, []);

  const handleCloseNotification = useCallback(() => {
    setCurrentBadge(null);
  }, []);

  // ContextProvider에 제공할 show 함수 (사용되지 않으므로 제거 또는 주석 처리)
  // const contextShowFunction = useCallback((badgeId: string) => {
      // ... (이전 코드)
  // }, [showBadgeNotification]);

  return {
    currentBadge, // 모달에 전달될 배지 상태
    handleCloseNotification, // 모달 닫기 함수
    showBadgeNotification, // 실제 배지 로딩 및 표시 트리거 함수
    // contextShowFunction // 제거
  };
}; 