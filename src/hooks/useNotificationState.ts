import { useState, useCallback, useEffect, useRef } from "react";
import { Badge } from "../types";
import { supabase } from "../lib/supabaseClient";
import { toZonedTime } from "date-fns-tz";

// 시간대 설정
const timeZone = "Asia/Seoul";

// 최대 동시 표시 배지 수
const MAX_DISPLAYED_BADGES = 3;

// 현재 주의 시작(월요일)과 끝(일요일) 날짜 계산 함수 추가
const getWeekDates = () => {
  // 오늘 날짜를 KST로 변환
  const todayKST = toZonedTime(new Date(), timeZone);
  // KST 기준 요일 (0:일요일, 1:월요일, ..., 6:토요일)
  const currentDay = todayKST.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // 일요일이면 이전 주 월요일로
  const diffToSunday = currentDay === 0 ? 0 : 7 - currentDay; // 일요일이면 오늘, 아니면 다음 일요일

  // 월요일 계산
  const monday = new Date(todayKST);
  monday.setDate(todayKST.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0); // 날짜 시작 시간으로 설정

  // 일요일 계산
  const sunday = new Date(todayKST);
  sunday.setDate(todayKST.getDate() + diffToSunday);
  sunday.setHours(23, 59, 59, 999); // 날짜 종료 시간으로 설정

  return { monday, sunday };
};

export const useNotificationState = () => {
  // 현재 화면에 표시될 배지 목록 상태
  const [displayedBadges, setDisplayedBadges] = useState<Badge[]>([]);
  // 가져올 배지 ID 큐
  const [notificationQueue, setNotificationQueue] = useState<string[]>([]);
  const [isLoadingBadge, setIsLoadingBadge] = useState(false);
  // 현재 처리 중인 배지 ID들을 추적
  const processingBadges = useRef<Set<string>>(new Set());

  // 배지 선택 모달 상태
  const [showBadgeSelectionModal, setShowBadgeSelectionModal] = useState(false);
  const [weeklyStreakAchieved, setWeeklyStreakAchieved] = useState(false);
  // 주간 보상 목표 상태 추가
  const [weeklyRewardGoal, setWeeklyRewardGoal] = useState<string>("");

  // 무한 로그 방지를 위해 주석 처리
  // console.log(
  //   "[StateHook] Running/Re-rendering. Queue:",
  //   notificationQueue,
  //   "Displayed:",
  //   displayedBadges.map((b) => b.id)
  // );

  // 사용자 정보와 주간 목표 가져오기
  const fetchWeeklyRewardGoal = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        console.error("[StateHook] User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("user_info")
        .select("weekly_reward_goal")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(
          "[StateHook] 주간 보상 목표를 가져오는 중 오류가 발생했습니다:",
          error
        );
      } else if (data && data.weekly_reward_goal) {
        setWeeklyRewardGoal(data.weekly_reward_goal);
      }
    } catch (err) {
      console.error(
        "[StateHook] 주간 보상 목표 조회 중 오류가 발생했습니다:",
        err
      );
    }
  }, []);

  // 컴포넌트 마운트 시 주간 목표 가져오기
  useEffect(() => {
    fetchWeeklyRewardGoal();
  }, [fetchWeeklyRewardGoal]);

  // 개별 배지 처리 함수 (동시에 여러 배지 처리 가능)
  const processBadge = useCallback(
    async (badgeId: string) => {
      // 이미 처리 중인 배지면 스킵
      if (processingBadges.current.has(badgeId)) {
        console.log(`[StateHook] Badge ${badgeId} is already being processed, skipping`);
        return;
      }

      // 처리 중 목록에 추가
      processingBadges.current.add(badgeId);
      setIsLoadingBadge(true);

      console.log(`[StateHook] Processing badge: ${badgeId}`);

      // 주간 스트릭 1 달성 시 배지 선택 모달 표시
      if (badgeId === "weekly_streak_1") {
        try {
          console.log(
            "[StateHook] Checking if weekly_streak_1 already earned this week"
          );

          // 사용자 정보 가져오기
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (!user) {
            console.error("[StateHook] User not authenticated");
            processingBadges.current.delete(badgeId);
            setNotificationQueue((prevQueue) => prevQueue.filter(id => id !== badgeId));
            setIsLoadingBadge(false);
            return;
          }

          // 이번 주의 시작(월요일)과 끝(일요일) 구하기
          const { monday, sunday } = getWeekDates();
          const mondayISOString = monday.toISOString();
          const sundayISOString = sunday.toISOString();

          console.log(
            `[StateHook] Checking weekly streak between ${mondayISOString} and ${sundayISOString}`
          );

          // 이번 주에 이미 weekly_streak_1 배지를 획득했는지 확인
          const { data: existingWeeklyBadge, error: checkError } =
            await supabase
              .from("earned_badges")
              .select("*")
              .eq("user_id", user.id)
              .eq("badge_id", "weekly_streak_1")
              .gte("earned_at", mondayISOString)
              .lte("earned_at", sundayISOString);

          if (checkError) throw checkError;

          // 이미 이번 주에 배지를 획득했으면 모달을 띄우지 않고 패스
          if (existingWeeklyBadge && existingWeeklyBadge.length > 0) {
            console.log(
              "[StateHook] Already earned weekly_streak_1 badge this week, skipping modal"
            );
          } else {
            // 아직 배지를 획득하지 않았으면 배지 선택 모달 표시
            console.log(
              "[StateHook] Weekly streak 1 achieved, showing badge selection modal"
            );
            setWeeklyStreakAchieved(true);
            setShowBadgeSelectionModal(true);
          }
        } catch (error) {
          console.error(
            "[StateHook] Error checking weekly badge status:",
            error
          );
        }

        // 큐에서 제거 및 처리 완료
        setNotificationQueue((prevQueue) => prevQueue.filter(id => id !== badgeId));
        processingBadges.current.delete(badgeId);
        setIsLoadingBadge(false);
        return;
      }

      try {
        // 사용자 정보 가져오기
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
          console.error("[StateHook] User not authenticated");
          processingBadges.current.delete(badgeId);
          setNotificationQueue((prevQueue) => prevQueue.filter(id => id !== badgeId));
          setIsLoadingBadge(false);
          return;
        }

        // 배지 저장 여부 결정 - weekly_streak_1 배지는 별도 처리
        if (badgeId !== "weekly_streak_1") {
          // 배지 저장 필요 (daily_hero 등)
          console.log(`[StateHook] Saving badge info for ${badgeId} to DB`);

          // 배지 타입 결정 (weekly_streak로 시작하면 weekly, 그 외는 mission)
          const badgeType = badgeId.startsWith("weekly_streak")
            ? "weekly"
            : "mission";

          try {
            // 1. RPC를 사용하여 직접 SQL 실행으로 배지 저장 (badge_type 반드시 포함)
            const { data: insertResult, error: rpcError } = await supabase.rpc(
              "insert_badge_with_type",
              {
                p_user_id: user.id,
                p_badge_id: badgeId,
                p_badge_type: badgeType,
              }
            );

            // RPC 함수가 없으면 일반 insert 시도
            if (rpcError) {
              console.log(
                "[StateHook] RPC not available, trying normal insert"
              );

              // 2. supabase client를 사용하여 저장
              const { data: insertData, error: insertError } = await supabase
                .from("earned_badges")
                .insert({
                  user_id: user.id,
                  badge_id: badgeId,
                  badge_type: badgeType, // 명시적으로 badge_type 설정
                  earned_at: new Date().toISOString(),
                })
                .select();

              if (insertError) {
                console.error(
                  "[StateHook] Error saving badge info:",
                  insertError
                );
              } else {
                console.log(
                  `[StateHook] Badge ${badgeId} saved successfully with type: ${badgeType}`,
                  insertData
                );
              }
            } else {
              console.log(
                `[StateHook] Badge ${badgeId} saved via RPC with type: ${badgeType}`,
                insertResult
              );
            }
          } catch (error) {
            console.error("[StateHook] Critical error saving badge:", error);
          }
        }

        const { data: badgeData, error: fetchError } = await supabase
          .from("badges")
          .select("*")
          .eq("id", badgeId)
          .single();

        if (fetchError) throw fetchError;

        if (badgeData) {
          console.log(
            "[StateHook] Fetched badge data, adding to displayedBadges:",
            badgeData.id
          );
          setDisplayedBadges((prevBadges) => {
            // 이미 표시 중이면 추가하지 않음
            if (prevBadges.some((b) => b.id === badgeData.id)) {
              return prevBadges;
            }
            // 최대 3개까지만 표시
            if (prevBadges.length >= MAX_DISPLAYED_BADGES) {
              console.log(`[StateHook] Max badges (${MAX_DISPLAYED_BADGES}) reached, removing oldest`);
              return [...prevBadges.slice(1), badgeData as Badge];
            }
            return [...prevBadges, badgeData as Badge];
          });
        } else {
          console.warn("[StateHook] Badge data not found for id:", badgeId);
        }
      } catch (error) {
        console.error("[StateHook] Error fetching badge data:", error);
      } finally {
        // 큐에서 제거 및 처리 완료
        setNotificationQueue((prevQueue) => prevQueue.filter(id => id !== badgeId));
        processingBadges.current.delete(badgeId);
        setIsLoadingBadge(false);
        console.log(
          "[StateHook] Finished processing badge:",
          badgeId
        );
      }
    },
    [] // 의존성 제거하여 무한 루프 방지
  );

  // 큐 상태 변경 감지 및 처리 시작 (모든 배지를 동시에 처리)
  useEffect(() => {
    if (notificationQueue.length === 0) return;

    console.log(`[StateHook useEffect] Queue has ${notificationQueue.length} items, processing all simultaneously`);
    
    // 큐의 모든 배지를 동시에 처리 (아직 처리 중이 아닌 것만)
    notificationQueue.forEach((badgeId) => {
      if (!processingBadges.current.has(badgeId)) {
        processBadge(badgeId);
      }
    });
  }, [notificationQueue, processBadge]);

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
    setWeeklyStreakAchieved(false);
  }, []);

  // 주간 스트릭 1 달성 시 사용자가 선택한 배지 처리
  const handleBadgeSelect = useCallback(
    async (badgeId: string) => {
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
            badge_type: "weekly", // 명시적으로 badge_type 설정
            earned_at: new Date().toISOString(),
            reward_text: weeklyRewardGoal, // 주간 보상 목표 저장
            reward_used: false, // 보상 사용 여부 초기값 false
          });

        if (insertError) throw insertError;

        // 배지 데이터 가져와서 알림 표시
        const { data: badgeData, error: fetchError } = await supabase
          .from("badges")
          .select("*")
          .eq("id", badgeId)
          .single();

        if (fetchError) throw fetchError;

        setDisplayedBadges((prevBadges) => [...prevBadges, badgeData as Badge]);
      } catch (error) {
        console.error("[StateHook] Error handling badge selection:", error);
      } finally {
        setShowBadgeSelectionModal(false);
        setWeeklyStreakAchieved(false);
      }
    },
    [weeklyRewardGoal]
  );

  return {
    displayedBadges,
    handleCloseNotification,
    showBadgeNotification,
    isLoadingBadge,
    notificationQueue,
    showBadgeSelectionModal,
    handleCloseBadgeSelectionModal,
    handleBadgeSelect,
    weeklyStreakAchieved,
    weeklyRewardGoal, // 주간 보상 목표 추가
  };
};
