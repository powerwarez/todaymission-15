import { useState, useCallback } from 'react';
import { Badge } from '../types';
import { supabase } from '../lib/supabaseClient';

export const useNotificationState = () => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  console.log('[StateHook] Running/Re-rendering. Current badge state:', currentBadge); // 훅 실행/리렌더링 시 상태 로그

  // 이 훅은 App 레벨에서 사용될 것이므로, DB 접근 로직을 포함합니다.
  const showBadgeNotification = useCallback(async (badgeId: string) => {
    console.log('[StateHook] showBadgeNotification called with badgeId:', badgeId);
    try {
        const { data: badgeData, error: fetchError } = await supabase
            .from('badges')
            .select('*')
            .eq('id', badgeId)
            .single();

        if (fetchError) throw fetchError;

        if (badgeData) {
            console.log('[StateHook] Fetched badge data:', badgeData);
            console.log('[StateHook] Calling setCurrentBadge with fetched data.');
            setCurrentBadge(badgeData as Badge);
        } else {
            console.warn('[StateHook] Badge data not found for id:', badgeId);
        }
    } catch (error) {
        console.error('[StateHook] Error fetching badge data:', error);
    }
  }, []);

  const handleCloseNotification = useCallback(() => {
    console.log('[StateHook] handleCloseNotification called. Setting currentBadge to null.');
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