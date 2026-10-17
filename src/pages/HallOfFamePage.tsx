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
  LuPlus,
  LuTrophy,
} from "react-icons/lu";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
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

  const badgeTabs: Array<{ key: "weekly" | "mission" | "all"; label: string }> = [
    { key: "weekly", label: "주간 도전 배지" },
    { key: "mission", label: "미션 배지" },
    { key: "all", label: "전체 배지" },
  ];

  return (
    <div className="px-1 sm:px-2 py-2">
      <PageHeader
        title="명예의 전당"
        description="지금까지 해낸 미션과 모은 배지를 한눈에 확인해요."
        icon={<LuTrophy size={24} />}
      />

      {isLoading && <Spinner label="데이터를 불러오는 중..." />}
      {error && (
        <p role="alert" className="ui-error-text mb-4">
          오류: {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 날짜별 기록 조회 섹션 */}
            <Card>
              <h2 className="ui-section-title mb-4">
                <LuCalendarDays /> 날짜별 기록 조회
              </h2>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <label htmlFor="record-date" className="font-bold ui-text-sub">
                  날짜 선택
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
                  // max도 KST 기준 yyyy-MM-dd
                  max={format(todayKSTObj, "yyyy-MM-dd", { timeZone })}
                />
              </div>

              <h3 className="text-lg mb-4">
                {/* 표시는 KST 기준으로 */}
                {formatInTimeZone(selectedDate, timeZone, "yyyy년 M월 d일")}{" "}
                미션 기록
              </h3>
              {!dailySnapshot && !dailySnapshotLoading && (
                <p className="text-center ui-text-sub font-semibold">
                  선택된 날짜에는 오늘의 미션 기록이 없어요.
                </p>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length === 0 && (
                  <p className="text-center ui-text-sub font-semibold">
                    이 날짜에 등록된 오늘의 미션이 없어요.
                  </p>
                )}
              {dailySnapshot && displayedMissionsForSelectedDate.length > 0 && (
                <ul className="space-y-3">
                  {displayedMissionsForSelectedDate.map(
                    (mission: Mission & { isCompleted: boolean }) => (
                      <li
                        key={mission.id}
                        className="ui-card-soft flex items-center justify-between gap-2"
                        style={{
                          padding: "0.75rem 1rem",
                          backgroundColor: mission.isCompleted
                            ? "var(--ui-accent-soft)"
                            : "var(--ui-surface)",
                        }}
                      >
                        <span
                          className={`flex-1 min-w-0 break-words font-bold ${
                            mission.isCompleted ? "line-through ui-text-sub" : ""
                          }`}
                        >
                          {mission.content}
                        </span>
                        {mission.isCompleted && (
                          <span className="ui-check" data-checked="true" style={{ width: 28, height: 28 }}>
                            <LuBadgeCheck size={16} aria-label="완료" />
                          </span>
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}
              {dailySnapshot &&
                displayedMissionsForSelectedDate.length > 0 &&
                missionLogsForSelectedDate.length === 0 && (
                  <p className="mt-4 text-center ui-text-sub font-semibold">
                    이 날짜에는 완료된 미션이 없어요.
                  </p>
                )}
            </Card>

            {/* 월별 달력 섹션 */}
            <Card>
              <div className="flex justify-between items-center mb-4 gap-2">
                <h2 className="ui-section-title">월간 달성 현황</h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    iconOnly
                    onClick={handlePreviousMonth}
                    aria-label="이전 달"
                  >
                    <LuChevronLeft size={22} />
                  </Button>
                  <span className="text-base sm:text-lg font-extrabold whitespace-nowrap">
                    {/* 표시도 KST 기준으로 */}
                    {formatInTimeZone(currentMonthDate, timeZone, "yyyy년 M월")}
                  </span>
                  <Button
                    variant="ghost"
                    iconOnly
                    onClick={handleNextMonth}
                    aria-label="다음 달"
                  >
                    <LuChevronRight size={22} />
                  </Button>
                </div>
              </div>
              <MonthlyCalendar
                year={currentMonthDate.getUTCFullYear()}
                month={currentMonthDate.getUTCMonth() + 1}
                snapshots={monthlySnapshots}
              />
            </Card>
          </div>

          {/* 획득한 배지 섹션 */}
          <Card>
            <h2 className="ui-section-title mb-4">
              <LuAward /> 획득한 배지
            </h2>

            {/* 배지 탭 */}
            <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="배지 종류">
              {badgeTabs.map((tab) => {
                const active = badgeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBadgeTab(tab.key)}
                    className="min-h-[44px] px-4 font-extrabold cursor-pointer"
                    style={{
                      border: "var(--ui-bw-thin) solid var(--ui-ink)",
                      borderRadius: "999px",
                      backgroundColor: active
                        ? "var(--ui-accent)"
                        : "var(--ui-surface)",
                      color: active ? "var(--ui-on-accent)" : "var(--ui-text)",
                      boxShadow: active ? "var(--ui-shadow-sm)" : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {badgesLoading ? (
              <Spinner />
            ) : displayedBadges.length === 0 &&
              (badgeTab !== "weekly" || pendingWeeklyBadges.length === 0) ? (
              <p className="text-center ui-text-sub font-semibold py-8">
                {badgeTab === "all" &&
                  "아직 획득한 배지가 없습니다. 미션을 완료하여 배지를 획득해보세요!"}
                {badgeTab === "mission" &&
                  "아직 획득한 미션 배지가 없습니다. 미션을 완료하여 배지를 획득해보세요!"}
                {badgeTab === "weekly" &&
                  "아직 획득한 주간 도전 배지가 없습니다. 주간 미션을 완료하여 배지를 획득해보세요!"}
              </p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* 주간 탭에서 미선택 배지 카드 표시 */}
                {badgeTab === "weekly" &&
                  pendingWeeklyBadges.map((pendingBadge) => {
                    const formattedDate = formatInTimeZone(
                      new Date(pendingBadge.earned_at),
                      timeZone,
                      "yyyy.MM.dd"
                    );

                    return (
                      <li key={`pending-${pendingBadge.id}`}>
                        <button
                          type="button"
                          className="relative w-full h-full flex flex-col items-center p-4 cursor-pointer"
                          style={{
                            backgroundColor: "var(--color-warning-light)",
                            border: "var(--ui-bw) dashed var(--color-warning-dark)",
                            borderRadius: "var(--ui-radius-md)",
                            color: "var(--color-warning-dark)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // 이벤트 버블링 방지
                            e.preventDefault(); // 기본 이벤트 방지
                            setShowRewardModal(false); // 보상 모달이 열려있으면 닫기
                            handleOpenBadgeSelectionModal(
                              pendingBadge.formatted_date || formattedDate
                            );
                          }}
                        >
                          <span
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: "var(--ui-accent)",
                              color: "var(--ui-on-accent)",
                              border: "var(--ui-bw-thin) solid var(--ui-ink)",
                            }}
                            aria-hidden="true"
                          >
                            <LuGift size={14} />
                          </span>

                          <span
                            className="w-20 h-20 mb-2 flex items-center justify-center rounded-full"
                            style={{
                              backgroundColor: "var(--ui-surface)",
                              border: "var(--ui-bw) dashed var(--color-warning-dark)",
                            }}
                            aria-hidden="true"
                          >
                            <LuPlus size={36} />
                          </span>
                          <span className="text-sm font-extrabold text-center">
                            아직 배지를 선택하지 않았어요
                          </span>
                          <span className="text-xs mt-1 text-center font-medium">
                            {formattedDate} 달성
                          </span>
                          <span className="text-xs mt-1 text-center font-bold">
                            눌러서 배지 선택하기
                          </span>
                          <Chip className="mt-2">주간 도전</Chip>
                        </button>
                      </li>
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
                    <li key={earnedBadge.id}>
                      <button
                        type="button"
                        onClick={() => toggleRewardDisplay(earnedBadge)}
                        className="relative w-full h-full flex flex-col items-center p-4 cursor-pointer"
                        style={{
                          backgroundColor: "var(--ui-surface)",
                          border: "var(--ui-bw-thin) solid var(--ui-ink)",
                          borderRadius: "var(--ui-radius-md)",
                          color: "var(--ui-text)",
                        }}
                      >
                        {/* 보상 정보가 있고 아직 사용하지 않은 경우에만 알림 배지 표시 */}
                        {hasReward && !earnedBadge.reward_used && (
                          <span
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: "var(--ui-accent)",
                              color: "var(--ui-on-accent)",
                              border: "var(--ui-bw-thin) solid var(--ui-ink)",
                            }}
                            aria-label="사용하지 않은 보상 있음"
                          >
                            <LuGift size={14} />
                          </span>
                        )}

                        <span
                          className="w-20 h-20 mb-2 flex items-center justify-center rounded-full p-1 overflow-hidden"
                          style={{
                            backgroundColor: "var(--ui-surface)",
                            border: "var(--ui-bw) solid var(--ui-ink)",
                          }}
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
                        </span>
                        <span className="text-sm font-extrabold text-center">
                          {badge.name}
                        </span>
                        <span className="text-xs mt-1 text-center ui-text-sub font-medium">
                          {formatInTimeZone(earnedDate, timeZone, "yyyy.MM.dd")}{" "}
                          획득
                        </span>
                        {badge.description && (
                          <span className="text-xs mt-1 text-center ui-text-sub">
                            {badge.description}
                          </span>
                        )}
                        <Chip className="mt-2">
                          {earnedBadge.badge?.badge_type === "weekly"
                            ? "주간 도전"
                            : "미션 완료"}
                        </Chip>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {/* 보상 모달 */}
      <Modal
        isOpen={showRewardModal && !!selectedBadgeReward}
        onClose={() => setShowRewardModal(false)}
        ariaLabel="주간 미션 보상"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <LuGift size={26} />
            <h2 className="text-xl">주간 미션 보상</h2>
          </div>

          <div
            className="ui-card-soft mb-4 font-bold"
            style={{
              backgroundColor: "var(--color-warning-light)",
              color: "var(--color-warning-dark)",
              borderColor: "var(--color-warning-dark)",
            }}
          >
            {selectedBadgeReward}
          </div>

          <div className="flex items-center justify-center mb-4">
            <Chip tone={rewardUsed ? "default" : "success"}>
              {rewardUsed ? "보상 사용 완료" : "보상 미사용"}
            </Chip>
          </div>

          <Button
            variant={rewardUsed ? "secondary" : "primary"}
            block
            onClick={toggleRewardUsed}
            loading={updatingReward}
          >
            {!updatingReward && (rewardUsed ? "다시 받을래요" : "사용했어요")}
          </Button>

          <p className="mt-4 text-sm ui-text-sub font-medium">
            주간 미션을 모두 완료했을 때 받은 보상입니다.
          </p>
          <p className="mt-1 text-sm ui-text-sub font-medium">
            {rewardUsed
              ? "보상을 이미 사용했습니다."
              : "보상을 아직 사용하지 않았습니다."}
          </p>
        </div>
      </Modal>

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
