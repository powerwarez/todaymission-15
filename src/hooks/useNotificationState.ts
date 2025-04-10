import { useState, useCallback, useEffect, useRef } from "react";
import { Badge } from "../types";
import { supabase } from "../lib/supabaseClient";

export const useNotificationState = () => {
  // 현재 화면에 표시될 배지 목록 상태
  const [displayedBadges, setDisplayedBadges] = useState<Badge[]>([]);
  // 가져올 배지 ID 큐
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);
  const [isLoadingBadge, setIsLoadingBadge] = useState(false);
  const isProcessingQueue = useRef(false);

  // 배지 선택 모달 상태
  const [showBadgeSelectionModal, setShowBadgeSelectionModal] = useState(false);
  const [weeklyStreakAchieved, setWeeklyStreakAchieved] = useState(false);

  console.log(
    "[StateHook] Running/Re-rendering. Queue:",
    notificationQueue,
    "Displayed:",
    displayedBadges.map((b) => b.id)
  );

  // 큐에서 다음 항목 처리 함수
  const processNextInQueue = useCallback(async (queue: string[]) => {
    // 함수 호출 시점의 큐 상태를 사용
    if (isProcessingQueue.current || queue.length === 0) {
      console.log(
        "[StateHook processNextInQueue] Skipping: Already processing or queue empty."
      );
      return;
    }

    isProcessingQueue.current = true;
    setIsLoadingBadge(true);

    const nextBadgeId = queue[0];
    console.log(`[StateHook] Processing queue, next ID: ${nextBadgeId}`);

    // 주간 스트릭 1 달성 시 배지 선택 모달 표시
    if (nextBadgeId === "weekly_streak_1") {
      console.log(
        "[StateHook] Weekly streak 1 achieved, showing badge selection modal"
      );
      setWeeklyStreakAchieved(true);
      setShowBadgeSelectionModal(true);

      // 큐에서 처리 시작한 ID 제거
      setNotificationQueue((prevQueue) => prevQueue.slice(1));

      // 처리 완료 플래그 설정
      isProcessingQueue.current = false;
      setIsLoadingBadge(false);
      return;
    }

    // 상태 업데이트: 큐에서 처리 시작한 ID 제거 (함수형 업데이트)
    // 중요: 여기서 큐를 업데이트하면 useEffect가 다시 실행될 수 있음
    setNotificationQueue((prevQueue) => prevQueue.slice(1));

    try {
      const { data: badgeData, error: fetchError } = await supabase
        .from("badges")
        .select("*")
        .eq("id", nextBadgeId)
        .single();

      if (fetchError) throw fetchError;

      if (badgeData) {
        console.log(
          "[StateHook] Fetched badge data, adding to displayedBadges:",
          badgeData.id
        );
        setDisplayedBadges((prevBadges) => {
          if (!prevBadges.some((b) => b.id === badgeData.id)) {
            return [...prevBadges, badgeData as Badge];
          }
          return prevBadges;
        });
      } else {
        console.warn("[StateHook] Badge data not found for id:", nextBadgeId);
      }
    } catch (error) {
      console.error("[StateHook] Error fetching badge data:", error);
    } finally {
      setIsLoadingBadge(false);
      // 처리가 끝났으므로 플래그 리셋
      // 중요: 이 플래그가 false가 된 후 useEffect가 다시 트리거되어야 함
      isProcessingQueue.current = false;
      console.log(
        "[StateHook] Finished processing ID:",
        nextBadgeId,
        "Reset processing flag."
      );
    }
    // 의존성 배열에서 notificationQueue 제거. queue 인자를 통해 최신 상태 받음
  }, []);

  // 큐 상태 변경 감지 및 처리 시작
  useEffect(() => {
    console.log(
      `[StateHook useEffect Check] Queue Length: ${notificationQueue.length}, Processing: ${isProcessingQueue.current}`
    );
    // 처리 중이 아니고 큐에 항목이 있을 때만 처리 시작
    if (!isProcessingQueue.current && notificationQueue.length > 0) {
      console.log("[StateHook useEffect] Triggering processNextInQueue.");
      // 현재 시점의 notificationQueue를 인자로 전달
      processNextInQueue(notificationQueue);
    } else {
      console.log(
        "[StateHook useEffect] Conditions not met, not triggering process."
      );
    }
    // processNextInQueue는 useCallback으로 감싸져 있고 의존성이 없으므로,
    // 이 useEffect는 notificationQueue가 변경될 때만 실행됨.
  }, [notificationQueue, processNextInQueue]);

  const showBadgeNotification = useCallback((badgeId: string) => {
    console.log(`[StateHook] Queuing badgeId: ${badgeId}`);
    setNotificationQueue((prevQueue) => {
      if (!prevQueue.includes(badgeId)) {
        return [...prevQueue, badgeId];
      }
      return prevQueue;
    });
  }, []);

  // 특정 배지 알림을 닫는 함수 (ID 필요)
  const handleCloseNotification = useCallback((badgeId: string) => {
    console.log(
      `[StateHook] handleCloseNotification called for badge: ${badgeId}. Removing from displayedBadges`
    );

    // displayedBadges 배열에서 해당 배지 제거 (함수형 업데이트)
    setDisplayedBadges((prevBadges) =>
      prevBadges.filter((badge) => badge.id !== badgeId)
    );
  }, []);

  // 배지 선택 모달 닫기
  const handleCloseBadgeSelectionModal = useCallback(() => {
    setShowBadgeSelectionModal(false);
  }, []);

  // 주간 스트릭 1 달성 시 사용자가 선택한 배지 처리
  const handleBadgeSelect = useCallback(async (badgeId: string) => {
    console.log(`[StateHook] Badge selected: ${badgeId}`);

    try {
      // 사용자 정보 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        console.error("[StateHook] User not authenticated");
        return;
      }

      // 주간 스트릭 달성에 대한 배지 획득 기록 저장
      const { error: insertError } = await supabase
        .from("earned_badges")
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          earned_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // 배지 데이터 가져와서 알림 표시
      const { data: badgeData, error: fetchError } = await supabase
        .from("badges")
        .select("*")
        .eq("id", badgeId)
        .single();

      if (fetchError) throw fetchError;

      if (badgeData) {
        setDisplayedBadges((prevBadges) => {
          if (!prevBadges.some((b) => b.id === badgeData.id)) {
            return [...prevBadges, badgeData as Badge];
          }
          return prevBadges;
        });
      }
    } catch (error) {
      console.error("[StateHook] Error handling badge selection:", error);
    } finally {
      // 모달 닫기
      setShowBadgeSelectionModal(false);
    }
  }, []);

  return {
    displayedBadges,
    handleCloseNotification,
    showBadgeNotification,
    isLoadingBadge,
    notificationQueue,
    showBadgeSelectionModal,
    weeklyStreakAchieved,
    handleCloseBadgeSelectionModal,
    handleBadgeSelect,
  };
};
