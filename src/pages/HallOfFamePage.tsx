import React, { useState, useMemo, useEffect, useCallback } from "react";
// import { useMissions } from '../hooks/useMissions'; // 삭제: 스냅샷에서 미션 정보 가져옴
import { useMissionLogs } from "../hooks/useMissionLogs";
// import { useMonthlyMissionLogs } from '../hooks/useMonthlyMissionLogs'; // 삭제: 스냅샷 훅 사용
import { useDailySnapshot } from "../hooks/useDailySnapshot"; // 일별 스냅샷 훅 추가
import { useMonthlySnapshots } from "../hooks/useMonthlySnapshots"; // 월별 스냅샷 훅 추가
import { useEarnedBadges } from "../hooks/useEarnedBadges"; // 획득한 배지 목록 가져오는 훅 추가
import MonthlyCalendar from "../components/MonthlyCalendar";
import {
  LuBadgeCheck,
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuAward,
  LuGift,
  LuX,
  LuTrophy,
} from "react-icons/lu";
import { Mission, EarnedBadge } from "../types"; // Mission 타입만 필요할 수 있음
// date-fns-tz import 추가, format 추가
import { formatInTimeZone, toZonedTime, format } from "date-fns-tz";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { BadgeSelectionModal } from "../components/BadgeSelectionModal";

// 시간대 설정 (AuthContext에서 사용하는 값으로 대체)
// const timeZone = "Asia/Seoul";

const HallOfFamePage: React.FC = () => {
  const { timeZone } = useAuth();
  const initialDate = new Date();
  // KST로 해석된 현재 시각 (Date 객체는 아님, ZonedDateTime 유사 객체)
  const todayKSTObj = toZonedTime(initialDate, timeZone);

  // selectedDate는 KST 기준 날짜를 나타내는 Date 객체 (UTC 타임스탬프는 KST 자정)
  const [selectedDate, setSelectedDate] = useState<Date>(
    new Date(format(todayKSTObj, "yyyy-MM-dd", { timeZone }) + "T00:00:00Z")
  );

  // currentMonthDate는 해당 월의 1일 UTC 00:00:00을 나타내는 Date 객체
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    new Date(Date.UTC(todayKSTObj.getFullYear(), todayKSTObj.getMonth(), 1))
  );

  // --- 날짜별 기록 관련 --- //
  // 훅에는 KST 기준 YYYY-MM-DD 문자열 전달
  const formattedSelectedDate = useMemo(() => {
    // selectedDate (UTC 자정 Date 객체)를 KST 기준으로 yyyy-MM-dd 포맷
    return format(toZonedTime(selectedDate, timeZone), "yyyy-MM-dd", {
      timeZone,
    });
  }, [selectedDate]);

  // useDailySnapshot과 useMissionLogs는 이제 문자열을 받도록 수정될 예정
  // 린터 오류는 다음 단계에서 훅 수정 시 해결됨
  const {
    snapshot: dailySnapshot,
    loading: dailySnapshotLoading,
    error: dailySnapshotError,
  } = useDailySnapshot(formattedSelectedDate);
  const {
    logs: missionLogsForSelectedDate,
    loading: dailyLogsLoading,
    error: dailyLogsError,
  } = useMissionLogs(formattedSelectedDate);

  // --- 월별 달력 관련 --- //
  const currentYear = currentMonthDate.getUTCFullYear();
  const currentMonth = currentMonthDate.getUTCMonth() + 1;
  const {
    snapshots: monthlySnapshots,
    loading: monthlySnapshotsLoading,
    error: monthlySnapshotsError,
  } = useMonthlySnapshots(currentYear, currentMonth);

  // --- 배지 탭 관련 상태 --- //
  const [badgeTab, setBadgeTab] = useState<"all" | "mission" | "weekly">(
    "weekly"
  );

  // 필터링된 배지 탭에 따라 배지 데이터 가져오기
  const {
    earnedBadges: allBadges,
    loading: allBadgesLoading,
    error: allBadgesError,
    refetch: refetchAllBadges,
  } = useEarnedBadges();
  const {
    earnedBadges: missionBadges,
    loading: missionBadgesLoading,
    error: missionBadgesError,
    refetch: refetchMissionBadges,
  } = useEarnedBadges("mission");
  const {
    earnedBadges: weeklyBadges,
    loading: weeklyBadgesLoading,
    error: weeklyBadgesError,
    refetch: refetchWeeklyBadges,
  } = useEarnedBadges("weekly");

  // 현재 선택된 탭에 따라 표시할 배지 목록 결정
  const displayedBadges = useMemo(() => {
    console.log("[DEBUG] 배지 필터링 - badgeTab:", badgeTab);
    console.log("[DEBUG] 전체 배지:", allBadges);
    console.log("[DEBUG] 주간 배지:", weeklyBadges);
    console.log("[DEBUG] 미션 배지:", missionBadges);

    let filteredBadges;

    switch (badgeTab) {
      case "mission":
        filteredBadges = missionBadges;
        break;
      case "weekly":
        // weekly_streak_1 배지는 제외하고 표시
        filteredBadges = weeklyBadges.filter(
          (badge) => badge.badge.id !== "weekly_streak_1"
        );
        console.log(
          "[DEBUG] weekly_streak_1 제외 후 주간 배지:",
          filteredBadges
        );
        break;
      case "all":
      default:
        // 전체 배지 탭에서도 weekly_streak_1 배지 제외
        filteredBadges = allBadges.filter(
          (badge) => badge.badge.id !== "weekly_streak_1"
        );
        break;
    }

    return filteredBadges;
  }, [badgeTab, allBadges, missionBadges, weeklyBadges]);

  // 배지 관련 로딩 및 에러 상태 통합
  const badgesLoading =
    allBadgesLoading || missionBadgesLoading || weeklyBadgesLoading;
  const badgesError = allBadgesError || missionBadgesError || weeklyBadgesError;

  // 로딩 및 에러 상태 통합 (기존 코드 수정)
  const isLoading =
    dailySnapshotLoading ||
    dailyLogsLoading ||
    monthlySnapshotsLoading ||
    badgesLoading;
  const error =
    dailySnapshotError ||
    dailyLogsError ||
    monthlySnapshotsError ||
    badgesError;

  // --- 날짜별 기록 표시 로직 (스냅샷 기반) --- //
  const completedMissionIdsForSelectedDate = useMemo(() => {
    return new Set(missionLogsForSelectedDate.map((log) => log.mission_id));
  }, [missionLogsForSelectedDate]);

  const displayedMissionsForSelectedDate = useMemo(() => {
    const missionsFromSnapshot: Mission[] =
      dailySnapshot?.missions_snapshot || [];
    return missionsFromSnapshot
      .map((mission: Mission) => ({
        ...mission,
        isCompleted: completedMissionIdsForSelectedDate.has(mission.id),
      }))
      .sort((a: Mission, b: Mission) => a.order - b.order);
  }, [dailySnapshot, completedMissionIdsForSelectedDate]);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDateString = event.target.value; // YYYY-MM-DD
    // 입력된 YYYY-MM-DD 문자열 (KST 기준 날짜)을 UTC 자정 Date 객체로 변환
    setSelectedDate(new Date(selectedDateString + "T00:00:00Z"));
  };
  // --- 끝: 날짜별 기록 관련 로직 --- //

  // --- 월별 달력 관련 로직 --- //
  const handlePreviousMonth = () => {
    setCurrentMonthDate(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1))
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1))
    );
  };
  // --- 끝: 월별 달력 관련 로직 --- //

  // 배지 이미지 URL 생성 함수
  const getBadgeImageUrl = (imagePath: string): string => {
    if (!imagePath) return "/placeholder_badge.png";
    if (imagePath.startsWith("http")) {
      return imagePath.replace(/([^:]\/)\/+/g, "$1");
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const bucketName = "badges";
    const cleanRelativePath = imagePath.replace(/^\/+|\/+$/g, "");
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanRelativePath}`;
  };

  // 보상 표시 관련 상태 추가
  const [selectedBadgeReward, setSelectedBadgeReward] = useState<string | null>(
    null
  );
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [rewardUsed, setRewardUsed] = useState(false);
  const [updatingReward, setUpdatingReward] = useState(false);

  // 배지를 클릭했을 때 주간 보상 표시 토글 함수
  const toggleRewardDisplay = (earnedBadge: EarnedBadge) => {
    // 주간 미션 배지이고 보상 정보가 있는 경우에만 표시
    if (
      earnedBadge.badge.badge_type === "weekly" &&
      earnedBadge.weekly_reward_goal
    ) {
      setSelectedBadgeReward(earnedBadge.weekly_reward_goal);
      setSelectedBadgeId(earnedBadge.id);
      setRewardUsed(earnedBadge.reward_used || false);
      setShowRewardModal(true);
    } else {
      toast("이 배지에는 보상 정보가 없습니다.", {
        icon: "⚠️",
        style: { backgroundColor: "#ffedd5", color: "#c2410c" },
      });
    }
  };

  // 보상 사용 여부 토글 함수
  const toggleRewardUsed = async () => {
    if (!selectedBadgeId) return;

    try {
      setUpdatingReward(true);

      // 현재 상태의 반대값으로 토글
      const newRewardUsed = !rewardUsed;

      const { error } = await supabase
        .from("earned_badges")
        .update({ reward_used: newRewardUsed })
        .eq("id", selectedBadgeId);

      if (error) throw error;

      // 상태 업데이트
      setRewardUsed(newRewardUsed);

      // 배지 목록 새로고침
      await Promise.all([
        refetchAllBadges(),
        refetchWeeklyBadges(),
        refetchMissionBadges(),
      ]);

      toast.success(
        newRewardUsed ? "보상을 사용했습니다!" : "보상 미사용으로 변경했습니다."
      );
    } catch (err) {
      console.error("보상 상태 업데이트 중 오류 발생:", err);
      toast.error("보상 상태 업데이트에 실패했습니다.");
    } finally {
      setUpdatingReward(false);
    }
  };

  // 미선택 배지 관련 상태 추가
  const [pendingWeeklyBadges, setPendingWeeklyBadges] = useState<
    {
      id: string;
      earned_at: string;
      reward_text?: string;
      formatted_date?: string;
    }[]
  >([]);
  const [showBadgeSelectionModal, setShowBadgeSelectionModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const { user } = useAuth();

  // 배지 모달 표시/숨김 함수 추가
  const handleOpenBadgeSelectionModal = (week: string) => {
    console.log(`[DEBUG] 배지 선택 모달 열기 - 선택한 주: ${week}`);
    console.log(`[DEBUG] 미선택 배지 확인:`, pendingWeeklyBadges);

    // 혹시 보상 모달이 열려있다면 닫기
    setShowRewardModal(false);
    setSelectedBadgeReward(null);
    setSelectedBadgeId(null);

    // 해당 주의 미선택 배지가 있는지 확인
    const pendingBadge = pendingWeeklyBadges.find(
      (badge) =>
        badge.formatted_date === week ||
        formatInTimeZone(new Date(badge.earned_at), timeZone, "yyyy-MM-dd") ===
          week
    );

    console.log(`[DEBUG] 해당 주의 미선택 배지:`, pendingBadge);

    if (!pendingBadge) {
      console.log(`[ERROR] 해당 주(${week})의 미선택 배지를 찾을 수 없습니다.`);
      toast.error("해당 주의 미선택 배지를 찾을 수 없습니다.");
      return;
    }

    setSelectedWeek(week);
    setShowBadgeSelectionModal(true);
  };

  const handleCloseBadgeSelectionModal = () => {
    setShowBadgeSelectionModal(false);
    setSelectedWeek(null);
  };

  // 배지 선택 처리 함수
  const handleBadgeSelect = async (badgeId: string) => {
    if (!user || !selectedWeek) return;

    try {
      console.log(`[DEBUG] 배지 선택: ${badgeId}, 주: ${selectedWeek}`);

      // 선택한 주간 미션의 보상 목표 가져오기
      const pendingBadge = pendingWeeklyBadges.find(
        (badge) =>
          badge.formatted_date === selectedWeek ||
          formatInTimeZone(
            new Date(badge.earned_at),
            timeZone,
            "yyyy-MM-dd"
          ) === selectedWeek
      );

      if (!pendingBadge) {
        console.error(
          `[ERROR] 해당 주차(${selectedWeek})의 미션 정보를 찾을 수 없습니다.`
        );
        toast.error("해당 주차의 미션 정보를 찾을 수 없습니다.");
        return;
      }

      console.log(`[DEBUG] 선택한 배지: ${badgeId}, 미션 정보:`, pendingBadge);

      // 1. badges 테이블에 해당 배지가 있는지 확인
      const { data: existingBadge, error: checkError } = await supabase
        .from("badges")
        .select("id")
        .eq("id", badgeId)
        .maybeSingle();

      if (checkError) {
        console.error("[ERROR] 배지 존재 여부 확인 오류:", checkError);
      }

      // 2. 배지가 없으면 badges 테이블에 먼저 추가
      if (!existingBadge) {
        console.log(
          `[DEBUG] 배지 ID ${badgeId}가 badges 테이블에 없어 추가합니다.`
        );

        // 기본 배지 이름과 설명 설정
        let badgeName = "주간 미션 달성 배지";
        let badgeDescription = "주간 미션을 모두 완료하여 획득한 배지입니다.";

        // weekly_streak_1 배지 정보 가져와서 사용
        try {
          const { data: weeklyStreakBadge, error: weeklyError } = await supabase
            .from("badges")
            .select("name, description")
            .eq("id", "weekly_streak_1")
            .single();

          if (weeklyError) {
            console.error(
              "[ERROR] weekly_streak_1 배지 정보 가져오기 오류:",
              weeklyError
            );
          } else if (weeklyStreakBadge) {
            badgeName = weeklyStreakBadge.name || badgeName;
            badgeDescription =
              weeklyStreakBadge.description || badgeDescription;
          }
        } catch (err) {
          console.error(
            "[ERROR] weekly_streak_1 배지 정보 가져오기 중 오류:",
            err
          );
        }

        // badges 테이블에 새 배지 추가
        const { error: insertBadgeError } = await supabase
          .from("badges")
          .insert({
            id: badgeId,
            name: badgeName,
            description: badgeDescription,
            image_path: "", // 기본 이미지 경로
            badge_type: "weekly",
            created_at: new Date().toISOString(),
          });

        if (insertBadgeError) {
          console.error("[ERROR] 배지 추가 오류:", insertBadgeError);
          throw insertBadgeError;
        }

        console.log(`[DEBUG] 배지 ID ${badgeId}를 badges 테이블에 추가 완료`);
      }

      // 3. 선택한 커스텀 배지 저장
      const { error, data } = await supabase
        .from("earned_badges")
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          badge_type: "weekly",
          earned_at: pendingBadge.earned_at,
          reward_text: pendingBadge.reward_text,
        })
        .select();

      if (error) {
        console.error("[ERROR] 배지 저장 오류:", error);
        throw error;
      }

      console.log(`[DEBUG] 배지 저장 성공:`, data);
      toast.success("배지를 획득했습니다!");

      // 배지 목록 새로고침
      await Promise.all([
        refetchAllBadges(),
        refetchWeeklyBadges(),
        refetchMissionBadges(),
      ]);

      // 선택 완료한 배지는 목록에서 제거
      setPendingWeeklyBadges((prev) =>
        prev.filter(
          (badge) =>
            badge.formatted_date !== selectedWeek &&
            formatInTimeZone(
              new Date(badge.earned_at),
              timeZone,
              "yyyy-MM-dd"
            ) !== selectedWeek
        )
      );

      // 모달 닫기
      handleCloseBadgeSelectionModal();
    } catch (err) {
      console.error("[ERROR] 배지 선택 중 오류 발생:", err);
      toast.error("배지 선택에 실패했습니다.");
    }
  };

  // 미선택 배지 확인 함수를 useCallback으로 감싸기
  const loadPendingBadges = useCallback(async () => {
    if (!user) return;

    try {
      console.log("[DEBUG] 미선택 배지 확인 시작 - loadPendingBadges()");
      console.log("[DEBUG] 현재 로그인한 사용자 ID:", user.id);

      // 1. 사용자의 모든 weekly_streak_1 배지 가져오기 (badge_type 상관없이)
      const { data: weeklyStreakBadges, error: weeklyError } = await supabase
        .from("earned_badges")
        .select("id, badge_id, earned_at, reward_text")
        .eq("user_id", user.id)
        .eq("badge_id", "weekly_streak_1")
        .order("earned_at", { ascending: false });

      if (weeklyError) {
        console.error("[ERROR] weekly_streak_1 배지 조회 오류:", weeklyError);
        return;
      }

      console.log("[DEBUG] 조회된 weekly_streak_1 배지:", weeklyStreakBadges);
      console.log("[DEBUG] 조회 쿼리 조건 - user_id:", user.id);

      if (!weeklyStreakBadges || weeklyStreakBadges.length === 0) {
        console.log("[DEBUG] weekly_streak_1 배지가 없습니다.");
        setPendingWeeklyBadges([]);
        return;
      }

      // 2. 사용자의 모든 커스텀 배지 가져오기 (badge_type 상관없이)
      const { data: allCustomBadges, error: customError } = await supabase
        .from("earned_badges")
        .select("id, badge_id, earned_at")
        .eq("user_id", user.id)
        .like("badge_id", "custom_%");

      if (customError) {
        console.error("[ERROR] 커스텀 배지 조회 오류:", customError);
        return;
      }

      console.log("[DEBUG] 조회된 모든 커스텀 배지:", allCustomBadges);
      console.log("[DEBUG] 커스텀 배지 조회 쿼리 조건 - user_id:", user.id);

      // 3. 미선택 배지 확인 (주 단위로 처리)
      const pendingBadges = [];

      for (const weeklyBadge of weeklyStreakBadges) {
        const earnedDate = new Date(weeklyBadge.earned_at);
        const formattedDate = formatInTimeZone(
          earnedDate,
          timeZone,
          "yyyy-MM-dd"
        );

        console.log(
          `[DEBUG] 확인 중인 배지: ${weeklyBadge.id}, 획득일: ${formattedDate}`
        );

        // 주의 시작일과 종료일 계산
        const earnedDateClone = new Date(earnedDate.getTime());
        const day = earnedDateClone.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        const diff = earnedDateClone.getDate() - day + (day === 0 ? -6 : 1); // 이번 주 월요일 날짜 계산

        const weekStart = new Date(earnedDateClone.getTime());
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart.getTime());
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        console.log(
          `[DEBUG] 주간 범위: ${weekStart.toISOString()} ~ ${weekEnd.toISOString()}`
        );

        // 이 주에 획득한 커스텀 배지 확인
        const customBadgesInWeek =
          allCustomBadges?.filter((customBadge) => {
            const customDate = new Date(customBadge.earned_at);
            const isInRange = customDate >= weekStart && customDate <= weekEnd;
            console.log(
              `[DEBUG] 커스텀 배지 ${
                customBadge.badge_id
              } 날짜: ${customDate.toISOString()}, 범위 내 여부: ${isInRange}`
            );
            return isInRange;
          }) || [];

        console.log(
          `[DEBUG] 같은 주에 획득한 커스텀 배지:`,
          customBadgesInWeek
        );

        // 커스텀 배지가 없으면 미선택 배지로 추가
        if (customBadgesInWeek.length === 0) {
          console.log(
            `[DEBUG] 미선택 배지로 추가: ${weeklyBadge.id}, 날짜: ${formattedDate}`
          );
          pendingBadges.push({
            id: weeklyBadge.id,
            earned_at: weeklyBadge.earned_at,
            reward_text: weeklyBadge.reward_text,
            formatted_date: formattedDate,
          });
        } else {
          console.log(
            `[DEBUG] 이미 선택한 배지가 있음: ${customBadgesInWeek
              .map((b) => b.badge_id)
              .join(", ")}`
          );
        }
      }

      console.log("[DEBUG] 최종 미선택 배지 목록:", pendingBadges);
      setPendingWeeklyBadges(pendingBadges);
    } catch (err) {
      console.error("[ERROR] 미선택 배지 확인 중 오류 발생:", err);
    }
  }, [user, timeZone, supabase, setPendingWeeklyBadges]);

  // 배지탭 변경 이벤트 처리를 위한 useEffect 추가 (기존 useEffect 위에 추가)
  useEffect(() => {
    // 배지 데이터가 로드된 후 미선택 배지 확인
    if (!badgesLoading && user) {
      console.log(
        "[DEBUG] 배지 로딩 완료 또는 배지 탭 변경으로 미선택 배지 확인 시작"
      );
      loadPendingBadges();
    }
  }, [badgeTab, badgesLoading, user, timeZone, loadPendingBadges]);

  // 배지 모달 디버깅을 위한 useEffect 추가
  useEffect(() => {
    console.log("배지 선택 모달 상태 변경:", {
      showBadgeSelectionModal,
      selectedWeek,
      showRewardModal,
      pendingBadge: pendingWeeklyBadges.find(
        (badge) =>
          badge.formatted_date === selectedWeek ||
          formatInTimeZone(
            new Date(badge.earned_at),
            timeZone,
            "yyyy-MM-dd"
          ) === selectedWeek
      ),
    });
  }, [
    showBadgeSelectionModal,
    selectedWeek,
    showRewardModal,
    pendingWeeklyBadges,
    timeZone,
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-8 flex items-center"
        style={{
          background: `linear-gradient(to right, var(--color-primary-medium), var(--color-accent))`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        <LuTrophy className="mr-3" style={{ color: "var(--color-accent)" }} />
        명예의 전당
      </h1>

      {isLoading && <p>데이터를 불러오는 중...</p>}
      {error && (
        <p style={{ color: "var(--color-text-error)" }}>오류: {error}</p>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 날짜별 기록 조회 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2
                className="text-xl font-semibold mb-4 flex items-center"
                style={{ color: "var(--color-text-primary)" }}
              >
                <LuCalendarDays className="mr-2" /> 날짜별 기록 조회
              </h2>
              <div className="flex items-center space-x-4 mb-6">
                <label htmlFor="record-date" className="text-gray-700">
                  날짜 선택:
                </label>
                <input
                  type="date"
                  id="record-date"
                  // value는 KST 기준 yyyy-MM-dd
                  value={format(
                    toZonedTime(selectedDate, timeZone),
                    "yyyy-MM-dd",
                    { timeZone }
                  )}
                  onChange={handleDateChange}
                  className="rounded px-3 py-2"
                  style={{
                    border: "1px solid var(--color-border-default)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--color-border-focus)";
                    e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--color-border-default)";
                    e.target.style.boxShadow = "none";
                  }}
                  // max도 KST 기준 yyyy-MM-dd
                  max={format(todayKSTObj, "yyyy-MM-dd", { timeZone })}
                />
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {/* 표시는 KST 기준으로 */}
                {formatInTimeZone(
                  selectedDate,
                  timeZone,
                  "yyyy년 M월 d일"
                )}{" "}
                미션 기록
              </h3>
              {!dailySnapshot && !dailySnapshotLoading && (
                <p className="text-center text-gray-500">
                  선택된 날짜에는 오늘의 미션 기록이 없어요.
                </p>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length === 0 && (
                  <p className="text-center text-gray-500">
                    이 날짜에 등록된 오늘의 미션이 없어요.
                  </p>
                )}
              {dailySnapshot && displayedMissionsForSelectedDate.length > 0 && (
                <ul className="space-y-3 pr-2">
                  {" "}
                  {/* max-h-60 overflow-y-auto 제거 */}
                  {displayedMissionsForSelectedDate.map(
                    (mission: Mission & { isCompleted: boolean }) => (
                      <li
                        key={mission.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors duration-200 text-sm ${
                          mission.isCompleted
                            ? "border-l-4"
                            : "bg-gray-100 border-l-4 border-gray-400"
                        }`}
                        style={
                          mission.isCompleted
                            ? {
                                backgroundColor: "var(--color-primary-light)",
                                borderLeftColor: "var(--color-primary-medium)",
                              }
                            : {}
                        }
                      >
                        <span
                          className={`flex-1 ${
                            mission.isCompleted
                              ? "line-through"
                              : "text-gray-800"
                          }`}
                          style={{
                            color: mission.isCompleted
                              ? "var(--color-text-primary)"
                              : undefined,
                          }}
                        >
                          {mission.content}
                        </span>
                        {mission.isCompleted && (
                          <LuBadgeCheck
                            className="text-lg ml-2"
                            style={{ color: "var(--color-success)" }}
                          />
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length > 0 &&
                missionLogsForSelectedDate.length === 0 && (
                  <p className="mt-4 text-center text-gray-500">
                    이 날짜에는 완료된 미션이 없어요.
                  </p>
                )}
            </div>

            {/* 월별 달력 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2
                  className="text-xl font-semibold flex items-center"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  월간 달성 현황
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-2 rounded transition-colors"
                    style={{ color: "var(--color-primary-medium)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <LuChevronLeft size={20} />
                  </button>
                  <span className="text-lg font-medium text-gray-700">
                    {/* 표시도 KST 기준으로 */}
                    {formatInTimeZone(currentMonthDate, timeZone, "yyyy년 M월")}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded transition-colors"
                    style={{ color: "var(--color-primary-medium)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <LuChevronRight size={20} />
                  </button>
                </div>
              </div>
              <MonthlyCalendar
                year={currentMonthDate.getUTCFullYear()}
                month={currentMonthDate.getUTCMonth() + 1}
                snapshots={monthlySnapshots}
              />
            </div>
          </div>

          {/* 획득한 배지 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2
              className="text-xl font-semibold mb-4 flex items-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              <LuAward className="mr-2" /> 획득한 배지
            </h2>

            {/* 배지 탭 순서 변경 */}
            <div className="flex border-b mb-6">
              <button
                className={`px-4 py-2 font-medium ${
                  badgeTab === "weekly" ? "border-b-2" : "hover:text-gray-700"
                }`}
                style={{
                  color:
                    badgeTab === "weekly"
                      ? "var(--color-primary-medium)"
                      : "var(--color-text-muted)",
                  borderBottomColor:
                    badgeTab === "weekly"
                      ? "var(--color-primary-medium)"
                      : "transparent",
                }}
                onClick={() => setBadgeTab("weekly")}
              >
                주간 도전 배지
              </button>
              <button
                className={`px-4 py-2 font-medium ${
                  badgeTab === "mission" ? "border-b-2" : "hover:text-gray-700"
                }`}
                style={{
                  color:
                    badgeTab === "mission"
                      ? "var(--color-primary-medium)"
                      : "var(--color-text-muted)",
                  borderBottomColor:
                    badgeTab === "mission"
                      ? "var(--color-primary-medium)"
                      : "transparent",
                }}
                onClick={() => setBadgeTab("mission")}
              >
                미션 배지
              </button>
              <button
                className={`px-4 py-2 font-medium ${
                  badgeTab === "all" ? "border-b-2" : "hover:text-gray-700"
                }`}
                style={{
                  color:
                    badgeTab === "all"
                      ? "var(--color-primary-medium)"
                      : "var(--color-text-muted)",
                  borderBottomColor:
                    badgeTab === "all"
                      ? "var(--color-primary-medium)"
                      : "transparent",
                }}
                onClick={() => setBadgeTab("all")}
              >
                전체 배지
              </button>
            </div>

            {badgesLoading ? (
              <div className="flex justify-center py-8">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2"
                  style={{ borderColor: "var(--color-primary-medium)" }}
                ></div>
              </div>
            ) : displayedBadges.length === 0 &&
              (badgeTab !== "weekly" || pendingWeeklyBadges.length === 0) ? (
              <p className="text-center text-gray-500 py-8">
                {badgeTab === "all" &&
                  "아직 획득한 배지가 없습니다. 미션을 완료하여 배지를 획득해보세요!"}
                {badgeTab === "mission" &&
                  "아직 획득한 미션 배지가 없습니다. 미션을 완료하여 배지를 획득해보세요!"}
                {badgeTab === "weekly" &&
                  "아직 획득한 주간 도전 배지가 없습니다. 주간 미션을 완료하여 배지를 획득해보세요!"}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* 주간 탭에서 미선택 배지 카드 표시 */}
                {badgeTab === "weekly" &&
                  pendingWeeklyBadges.map((pendingBadge) => {
                    const formattedDate = formatInTimeZone(
                      new Date(pendingBadge.earned_at),
                      timeZone,
                      "yyyy.MM.dd"
                    );

                    console.log(
                      "[DEBUG] 렌더링 - 미선택 배지 카드:",
                      pendingBadge.id,
                      formattedDate
                    );

                    return (
                      <div
                        key={`pending-${pendingBadge.id}`}
                        className="flex flex-col items-center p-4 rounded-lg transition-colors cursor-pointer border-2 border-dashed relative"
                        style={{
                          backgroundColor: "var(--color-bg-warning)",
                          borderColor: "var(--color-border-warning)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--color-bg-warning-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--color-bg-warning)";
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // 이벤트 버블링 방지
                          e.preventDefault(); // 기본 이벤트 방지
                          console.log(
                            "[DEBUG] 미선택 배지 카드 클릭됨 - 배지 모달 표시"
                          );
                          setShowRewardModal(false); // 보상 모달이 열려있으면 닫기
                          handleOpenBadgeSelectionModal(
                            pendingBadge.formatted_date || formattedDate
                          );
                        }}
                      >
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md z-10"
                          style={{
                            backgroundColor: "var(--color-primary-medium)",
                          }}
                        >
                          <LuGift size={14} />
                        </div>

                        <div
                          className="w-20 h-20 mb-2 flex items-center justify-center rounded-full 
                        p-1 bg-white shadow-md overflow-hidden border-4"
                          style={{ borderColor: "var(--color-border-warning)" }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12"
                            style={{ color: "var(--color-text-warning)" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-800 text-center">
                          아직 배지를 선택하지 않았어요
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {formattedDate} 달성
                        </p>
                        <p
                          className="text-xs mt-1 text-center"
                          style={{ color: "var(--color-text-warning)" }}
                        >
                          클릭하여 배지 선택하기
                        </p>
                        <span
                          className="mt-2 px-2 py-0.5 text-xs rounded-full bg-opacity-20 text-center font-medium"
                          style={{
                            backgroundColor: "var(--color-primary-light)",
                            color: "var(--color-primary-dark)",
                          }}
                        >
                          주간 도전
                        </span>
                      </div>
                    );
                  })}

                {displayedBadges.map((earnedBadge) => {
                  const badge = earnedBadge.badge;
                  const earnedDate = new Date(earnedBadge.earned_at);

                  // 보상 정보 확인
                  const hasReward =
                    badge.badge_type === "weekly" &&
                    earnedBadge.weekly_reward_goal;

                  return (
                    <div
                      key={earnedBadge.id}
                      className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-pink-50 transition-colors cursor-pointer relative"
                      onClick={() => toggleRewardDisplay(earnedBadge)}
                    >
                      {/* 보상 정보가 있고 아직 사용하지 않은 경우에만 알림 배지 표시 */}
                      {hasReward && !earnedBadge.reward_used && (
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md z-10"
                          style={{
                            backgroundColor: "var(--color-primary-medium)",
                          }}
                        >
                          <LuGift size={14} />
                        </div>
                      )}

                      <div
                        className="w-20 h-20 mb-2 flex items-center justify-center 
                        border-4 border-gradient-to-r from-pink-300 to-indigo-300 rounded-full 
                        p-1 bg-white shadow-md overflow-hidden"
                      >
                        <img
                          src={getBadgeImageUrl(badge.image_path)}
                          alt={badge.name}
                          className="max-w-full max-h-full object-contain rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder_badge.png";
                          }}
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 text-center">
                        {badge.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {formatInTimeZone(earnedDate, timeZone, "yyyy.MM.dd")}{" "}
                        획득
                      </p>
                      {badge.description && (
                        <p className="text-xs text-gray-600 mt-1 text-center">
                          {badge.description}
                        </p>
                      )}
                      <span
                        className={`mt-2 px-2 py-0.5 text-xs rounded-full bg-opacity-20 text-center font-medium`}
                        style={{
                          backgroundColor:
                            earnedBadge.badge?.badge_type === "weekly"
                              ? "var(--color-primary-light)"
                              : "var(--color-secondary-light)",
                          color:
                            earnedBadge.badge?.badge_type === "weekly"
                              ? "var(--color-primary-dark)"
                              : "var(--color-secondary-dark)",
                        }}
                      >
                        {earnedBadge.badge?.badge_type === "weekly"
                          ? "주간 도전"
                          : "미션 완료"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 보상 모달 */}
      {showRewardModal && selectedBadgeReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowRewardModal(false)}
          ></div>
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full m-4 shadow-xl">
            <button
              onClick={() => setShowRewardModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <LuX size={20} />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <LuGift
                  className="mr-2"
                  style={{ color: "var(--color-text-warning)" }}
                  size={24}
                />
                <h2
                  className="text-xl font-bold"
                  style={{ color: "var(--color-text-warning)" }}
                >
                  주간 미션 보상
                </h2>
              </div>

              <div
                className="p-4 rounded-lg border mb-4"
                style={{
                  backgroundColor: "var(--color-bg-warning)",
                  borderColor: "var(--color-border-warning)",
                }}
              >
                <p style={{ color: "var(--color-text-warning-dark)" }}>
                  {selectedBadgeReward}
                </p>
              </div>

              <div className="flex items-center justify-center mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rewardUsed ? "bg-gray-100 text-gray-600" : ""
                  }`}
                  style={
                    !rewardUsed
                      ? {
                          backgroundColor: "var(--color-success-light)",
                          color: "var(--color-success-dark)",
                        }
                      : {}
                  }
                >
                  {rewardUsed ? "보상 사용 완료" : "보상 미사용"}
                </span>
              </div>

              <button
                onClick={toggleRewardUsed}
                disabled={updatingReward}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center text-white`}
                style={{
                  backgroundColor: rewardUsed
                    ? "var(--color-secondary-medium)"
                    : "var(--color-primary-medium)",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = rewardUsed
                      ? "var(--color-secondary-dark)"
                      : "var(--color-primary-dark)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = rewardUsed
                    ? "var(--color-secondary-medium)"
                    : "var(--color-primary-medium)";
                }}
              >
                {updatingReward ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></span>
                ) : (
                  <span
                    className={`mr-2 ${
                      rewardUsed ? "text-white" : "text-white"
                    }`}
                  >
                    {rewardUsed ? "다시 받을래요" : "사용했어요"}
                  </span>
                )}
              </button>

              <p className="mt-4 text-sm text-gray-600">
                주간 미션을 모두 완료했을 때 받은 보상입니다.
              </p>
              <p className="mt-4 text-sm text-gray-600">
                {rewardUsed
                  ? " 보상을 이미 사용했습니다."
                  : " 보상을 아직 사용하지 않았습니다."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 배지 선택 모달 */}
      {showBadgeSelectionModal && selectedWeek && !showRewardModal && (
        <BadgeSelectionModal
          showModal={showBadgeSelectionModal}
          onClose={handleCloseBadgeSelectionModal}
          onBadgeSelect={handleBadgeSelect}
          weeklyRewardGoal={
            pendingWeeklyBadges.find(
              (badge) =>
                badge.formatted_date === selectedWeek ||
                formatInTimeZone(
                  new Date(badge.earned_at),
                  timeZone,
                  "yyyy-MM-dd"
                ) === selectedWeek
            )?.reward_text || ""
          }
        />
      )}
    </div>
  );
};

export default HallOfFamePage;
