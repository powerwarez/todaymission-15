import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { MissionLog } from "../types";

// 오디오 재생 함수
const playSound = (soundFile: string) => {
  const audio = new Audio(soundFile);
  audio.load();
  audio.play().catch((e) => console.error("Error playing sound:", e));
};

const REPEATABLE_CONDITION_TYPES = ["DAILY_COMPLETIONS_REPEATABLE"] as const;
const ONE_TIME_CONDITION_TYPES = ["DAILY_COMPLETIONS", "WEEKLY_COMPLETIONS"] as const;
const VALID_CHALLENGE_CONDITION_TYPES = [
  ...ONE_TIME_CONDITION_TYPES,
  ...REPEATABLE_CONDITION_TYPES,
] as const;

type ChallengeConditionType = (typeof VALID_CHALLENGE_CONDITION_TYPES)[number];

// 도전과제 타입 (공용 + 사용자 정의)
interface UserChallenge {
  id: string;
  name: string;
  badge_id: string;
  condition_type: ChallengeConditionType;
  required_count: number;
  is_global?: boolean;
}

const isRepeatableChallenge = (conditionType: string) =>
  REPEATABLE_CONDITION_TYPES.includes(
    conditionType as (typeof REPEATABLE_CONDITION_TYPES)[number]
  );

const getRepeatableTargetCount = (
  dailyHeroCount: number,
  requiredCount: number
) => Math.floor(dailyHeroCount / requiredCount);

// 파라미터: formattedDate - 선택된 날짜, totalMissionsForDate - 해당 날짜의 총 미션 수 (optional)
export const useMissionLogs = (formattedDate: string, totalMissionsForDate?: number) => {
  const { user } = useAuth();
  const { showBadgeNotification } = useNotification();
  const [logs, setLogs] = useState<MissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 오늘 완료된 로그 수 상태 추가 (예측용)
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  // 전체 완료 로그 수 상태 추가 (예측용) - setter만 사용
  const [, setTotalCompletedCount] = useState<number | null>(
    null
  );
  // 선택된 날짜의 총 미션 수 상태 (파라미터로 받은 값 또는 DB에서 조회한 값)
  const [totalMissionsToday, setTotalMissionsToday] = useState<number | null>(
    null
  );
  
  // totalMissionsForDate가 전달되면 해당 값을 사용
  useEffect(() => {
    if (totalMissionsForDate !== undefined && totalMissionsForDate > 0) {
      setTotalMissionsToday(totalMissionsForDate);
      console.log(`[useMissionLogs] totalMissionsForDate from parameter: ${totalMissionsForDate}`);
    }
  }, [totalMissionsForDate]);
  // 이전에 획득한 배지 ID 목록 상태 추가 (예측용, Set 사용) - 최초 획득 확인용
  const [previouslyEarnedBadgeIds, setPreviouslyEarnedBadgeIds] = useState<
    Set<string>
  >(new Set());
  // 반복 달성 배지별 획득 횟수
  const [repeatableBadgeEarnedCounts, setRepeatableBadgeEarnedCounts] =
    useState<Record<string, number>>({});
  // 사용자 정의 도전과제 목록
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  // 주간 완료 횟수 (이번 주) - 더 이상 사용하지 않음 (호환성 유지)
  const [, setWeeklyCompletedCount] = useState<number>(0);
  // 오늘의 영웅 배지 획득 횟수 (전체)
  const [dailyHeroCount, setDailyHeroCount] = useState<number>(0);
  // addLog 중복 실행 방지 플래그 (ref 사용)
  const isAddingLogRef = useRef(false);
  // addLog 실행 중 상태 (UI 표시용)
  const [isAddingLog, setIsAddingLog] = useState(false);
  // 주간 미션 달성 배지 획득 횟수 (전체)
  const [weeklyStreakCount, setWeeklyStreakCount] = useState<number>(0);

  const fetchLogs = useCallback(async () => {
    if (!user || !formattedDate) {
      setLogs([]);
      setLoading(false);
      return;
    }
    console.log("[useMissionLogs] Fetching logs for date:", formattedDate);
    setLoading(true);
    setError(null);
    try {
      // completed_at 이 date 타입이라고 가정하고 단순 비교
      const { data, error: fetchError } = await supabase
        .from("mission_logs") // 테이블 이름 확인 필요
        .select("*")
        .eq("user_id", user.id)
        .eq("completed_at", formattedDate);

      // 만약 completed_at 이 timestamptz 라면 아래 범위 쿼리 사용
      /*
      // KST 기준 시작 시각 (00:00:00)과 종료 시각 (다음 날 00:00:00) 계산
      const startOfDayKST = toZonedTime(`${formattedDate}T00:00:00`, timeZone).toISOString(); // toZonedTime 사용 예시 (주의: toZonedTime은 Date 객체 반환 안 함)
      const nextDay = new Date(new Date(formattedDate + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000);
      const endOfDayKST = toZonedTime(`${nextDay.toISOString().split('T')[0]}T00:00:00`, timeZone).toISOString();

      console.log('[useMissionLogs] Query range (timestamptz):', startOfDayKST, endOfDayKST);

      const { data, error: fetchError } = await supabase
        .from('mission_logs') // 테이블 이름 확인 필요
        .select('*')
        .eq('user_id', user.id)
        // completed_at 필터링: KST 기준 하루 범위
        .gte('completed_at', startOfDayKST)
        .lt('completed_at', endOfDayKST);
      */

      if (fetchError) throw fetchError;
      console.log("[useMissionLogs] Fetched logs:", data);
      setLogs(data || []);
    } catch (err: unknown) {
      console.error("Error fetching mission logs:", err);
      setError("미션 기록을 불러오는 중 오류가 발생했습니다.");
      setLogs([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, [user, formattedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 데이터 로딩 시 관련 상태 업데이트
  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    console.log(
      "[useMissionLogs] Fetching initial data for badge prediction..."
    );
    setLoading(true); // 로딩 시작
    setError(null);
    try {
      // Fetch logs for the specific date to get initial completedTodayCount
      const { data: logsData, error: logsError } = await supabase
        .from("mission_logs")
        .select("*") // count만 필요하므로 id만 가져옴
        .eq("user_id", user.id)
        .eq("completed_at", formattedDate);

      if (logsError) throw logsError;
      const initialLogs = logsData || [];
      setLogs(initialLogs); // 기존 로그 상태 설정
      setCompletedTodayCount(initialLogs.length); // 오늘 완료 개수 초기화
      console.log(
        `[useMissionLogs] Initial completedTodayCount: ${initialLogs.length}`
      );

      // Fetch total mission count for the selected date
      // totalMissionsForDate가 파라미터로 전달된 경우 해당 값 사용
      let missionsCount = totalMissionsForDate;
      
      if (missionsCount === undefined || missionsCount <= 0) {
        // 파라미터가 없으면 해당 날짜의 스냅샷에서 미션 수를 가져오거나, 없으면 현재 미션 수 사용
        const { data: snapshotData, error: snapshotError } = await supabase
          .from("daily_mission_snapshots")
          .select("total_missions_count")
          .eq("user_id", user.id)
          .eq("date", formattedDate)
          .maybeSingle();
        
        if (!snapshotError && snapshotData && snapshotData.total_missions_count > 0) {
          missionsCount = snapshotData.total_missions_count;
          console.log(`[useMissionLogs] totalMissionsToday from snapshot: ${missionsCount}`);
        } else {
          // 스냅샷이 없으면 현재 미션 테이블에서 가져옴
          const { count: currentMissionsCount, error: missionsError } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (missionsError) throw missionsError;
          missionsCount = currentMissionsCount ?? 0;
          console.log(`[useMissionLogs] totalMissionsToday from missions table: ${missionsCount}`);
        }
      } else {
        console.log(`[useMissionLogs] totalMissionsToday from parameter: ${missionsCount}`);
      }
      
      setTotalMissionsToday(missionsCount ?? 0);

      // Fetch total completed count (all time)
      const { count: totalCount, error: totalCountError } = await supabase
        .from("mission_logs")
        .select("id", { count: "exact", head: true }) // count만 가져옴
        .eq("user_id", user.id);

      if (totalCountError) throw totalCountError;
      setTotalCompletedCount(totalCount ?? 0);
      console.log(
        `[useMissionLogs] Initial totalCompletedCount: ${totalCount}`
      );

      // 기본 배지 ID (도전과제 테이블에서 관리되지 않는 것들)
      const oneTimeBadgeIds: string[] = [];

      // 도전과제 로드 (공용 도전과제 + 사용자 정의 도전과제)
      // is_global = true인 것은 공용 도전과제, user_id가 현재 사용자인 것은 개인 도전과제
      const { data: allChallengesData, error: challengesError } =
        await supabase
          .from("challenges")
          .select("id, name, badge_id, condition_type, required_count, is_global")
          .or(`is_global.eq.true,user_id.eq.${user.id}`);

      if (challengesError) {
        console.error("도전과제 로드 오류:", challengesError);
      } else {
        // condition_type이 유효한 것만 필터링
        const validChallenges = (allChallengesData || []).filter(
          (c) => VALID_CHALLENGE_CONDITION_TYPES.includes(c.condition_type)
        );
        setUserChallenges(validChallenges);
        console.log("[useMissionLogs] All challenges loaded (global + user):", validChallenges);
      }

      // 도전과제 배지 ID도 추가 (공용 + 사용자 정의)
      const challengeBadgeIds = (allChallengesData || []).map(c => c.badge_id);
      const allBadgeIdsToCheck = [...oneTimeBadgeIds, ...challengeBadgeIds];

      const { data: earnedBadgesData, error: earnedBadgesError } =
        await supabase
          .from("earned_badges")
          .select("badge_id")
          .eq("user_id", user.id)
          .in("badge_id", allBadgeIdsToCheck);

      if (earnedBadgesError) throw earnedBadgesError;
      const earnedCounts: Record<string, number> = {};
      earnedBadgesData?.forEach((badge) => {
        earnedCounts[badge.badge_id] = (earnedCounts[badge.badge_id] || 0) + 1;
      });
      const earnedSet = new Set(Object.keys(earnedCounts));
      setPreviouslyEarnedBadgeIds(earnedSet);
      setRepeatableBadgeEarnedCounts(earnedCounts);
      console.log(
        "[useMissionLogs] Initial previouslyEarnedBadgeIds:",
        earnedSet
      );

      // 주간 완료 횟수 계산 (이번 주 월요일부터 오늘까지) - 더 이상 사용하지 않지만 호환성 유지
      const today = new Date(formattedDate);
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      const mondayStr = monday.toISOString().split("T")[0];

      const { count: weeklyCount, error: weeklyCountError } = await supabase
        .from("mission_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("completed_at", mondayStr)
        .lte("completed_at", formattedDate);

      if (weeklyCountError) {
        console.error("주간 완료 횟수 로드 오류:", weeklyCountError);
      } else {
        setWeeklyCompletedCount(weeklyCount ?? 0);
        console.log(`[useMissionLogs] Weekly completed count: ${weeklyCount}`);
      }

      // 오늘의 영웅 배지 획득 횟수 (전체)
      const { count: dailyHeroCountResult, error: dailyHeroError } = await supabase
        .from("earned_badges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("badge_id", "daily_hero");

      if (dailyHeroError) {
        console.error("오늘의 영웅 배지 횟수 로드 오류:", dailyHeroError);
      } else {
        setDailyHeroCount(dailyHeroCountResult ?? 0);
        console.log(`[useMissionLogs] Daily hero badge count: ${dailyHeroCountResult}`);
      }

      // 주간 미션 달성 배지 획득 횟수 (전체) - weekly_streak_1과 custom_ 주간 배지 모두 포함
      const { count: weeklyStreakCountResult, error: weeklyStreakError } = await supabase
        .from("earned_badges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("badge_type", "weekly");

      if (weeklyStreakError) {
        console.error("주간 미션 달성 배지 횟수 로드 오류:", weeklyStreakError);
      } else {
        setWeeklyStreakCount(weeklyStreakCountResult ?? 0);
        console.log(`[useMissionLogs] Weekly streak badge count: ${weeklyStreakCountResult}`);
      }

      // --- 누락된 도전과제 자동 달성 체크 ---
      const currentDailyHeroCount = dailyHeroCountResult ?? 0;
      const currentWeeklyStreakCount = weeklyStreakCountResult ?? 0;
      const validChallengesForCheck = (allChallengesData || []).filter(
        (c) => VALID_CHALLENGE_CONDITION_TYPES.includes(c.condition_type)
      );

      // 조건을 충족하지만 아직 획득하지 않은 도전과제 찾기
      const missedChallenges = validChallengesForCheck.filter((challenge) => {
        if (challenge.condition_type === "DAILY_COMPLETIONS_REPEATABLE") {
          const targetCount = getRepeatableTargetCount(
            currentDailyHeroCount,
            challenge.required_count
          );
          const currentEarnedCount = earnedCounts[challenge.badge_id] || 0;
          return targetCount > currentEarnedCount;
        }

        // 이미 획득한 배지는 스킵 (1회성)
        if (earnedSet.has(challenge.badge_id)) {
          return false;
        }

        // 조건 체크
        if (challenge.condition_type === "DAILY_COMPLETIONS") {
          return currentDailyHeroCount >= challenge.required_count;
        } else if (challenge.condition_type === "WEEKLY_COMPLETIONS") {
          return currentWeeklyStreakCount >= challenge.required_count;
        }
        return false;
      });

      // 누락된 도전과제가 있으면 자동으로 배지 부여
      if (missedChallenges.length > 0) {
        console.log(`[useMissionLogs] 누락된 도전과제 발견:`, missedChallenges.map(c => c.name));

        const badgesToInsert = missedChallenges.map((challenge) => ({
          user_id: user.id,
          badge_id: challenge.badge_id,
          badge_type: "mission",
          earned_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
          .from("earned_badges")
          .insert(badgesToInsert);

        if (insertError) {
          console.error("[useMissionLogs] 누락된 배지 자동 부여 오류:", insertError);
        } else {
          console.log(`[useMissionLogs] 누락된 배지 ${missedChallenges.length}개 자동 부여 완료`);
          
          // 알림 표시
          for (const challenge of missedChallenges) {
            console.log(`🔔 자동 부여된 배지: ${challenge.name}`);
            showBadgeNotification(challenge.badge_id);
          }

          // earnedSet / earnedCounts 업데이트
          missedChallenges.forEach((c) => {
            earnedSet.add(c.badge_id);
            earnedCounts[c.badge_id] = (earnedCounts[c.badge_id] || 0) + 1;
          });
          setRepeatableBadgeEarnedCounts({ ...earnedCounts });
        }
      }
      // --- 누락된 도전과제 자동 달성 체크 끝 ---

    } catch (err: unknown) {
      console.error("Error fetching initial data for badge prediction:", err);
      setError("초기 데이터 로딩 중 오류 발생");
    } finally {
      setLoading(false); // 초기 데이터 로딩 완료
    }
  }, [user, formattedDate, showBadgeNotification, totalMissionsForDate]);

  // 컴포넌트 마운트 또는 사용자/날짜 변경 시 초기 데이터 로드
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const addLog = async (missionId: string) => {
    if (!user || !formattedDate) return null;

    // 중복 실행 방지
    if (isAddingLogRef.current) {
      console.log("[addLog] 이미 실행 중입니다. 중복 호출 무시.");
      return null;
    }
    isAddingLogRef.current = true;
    setIsAddingLog(true);

    const todayKSTString = formattedDate;

    // 1. 해당 날짜의 스냅샷에서 실제 total_missions_count 조회 (상태값 대신 직접 조회)
    let actualTotalMissions = totalMissionsToday;
    let actualCompletedMissions = completedTodayCount;
    
    const { data: snapshotData, error: snapshotQueryError } = await supabase
      .from("daily_mission_snapshots")
      .select("total_missions_count, completed_missions_count")
      .eq("user_id", user.id)
      .eq("date", todayKSTString)
      .maybeSingle();
    
    if (!snapshotQueryError && snapshotData) {
      actualTotalMissions = snapshotData.total_missions_count;
      actualCompletedMissions = snapshotData.completed_missions_count;
      console.log(`[addLog] 스냅샷에서 조회: 총 ${actualTotalMissions}, 완료 ${actualCompletedMissions}`);
    } else if (totalMissionsToday === null || totalMissionsToday <= 0) {
      // 스냅샷도 없고 상태값도 없으면 진행 불가
      console.warn("[addLog] 스냅샷과 상태값 모두 없음, totalMissionsToday:", totalMissionsToday);
      // totalMissionsForDate가 있으면 그 값 사용
      if (totalMissionsForDate && totalMissionsForDate > 0) {
        actualTotalMissions = totalMissionsForDate;
        console.log(`[addLog] totalMissionsForDate 사용: ${actualTotalMissions}`);
      } else {
        console.warn("[addLog] 총 미션 수를 확인할 수 없음");
        isAddingLogRef.current = false;
        setIsAddingLog(false);
        return null;
      }
    }

    // 2. 해당 날짜에 이미 오늘의 영웅 배지를 획득했는지 DB에서 직접 체크
    const { data: existingDailyHeroBadge, error: badgeCheckError } = await supabase
      .from("earned_badges")
      .select("id")
      .eq("user_id", user.id)
      .eq("badge_id", "daily_hero")
      .gte("earned_at", todayKSTString + "T00:00:00")
      .lt("earned_at", todayKSTString + "T23:59:59.999")
      .limit(1);
    
    const alreadyHasDailyHeroToday = !badgeCheckError && existingDailyHeroBadge && existingDailyHeroBadge.length > 0;
    if (alreadyHasDailyHeroToday) {
      console.log(`[addLog] 해당 날짜(${todayKSTString})에 이미 오늘의 영웅 배지 있음`);
    }

    // 3. 현재 완료 수와 다음 완료 수 계산
    const currentCompletedToday = actualCompletedMissions;
    const newCompletedToday = currentCompletedToday + 1;

    console.log(`[addLog] 배지 체크: 총 미션=${actualTotalMissions}, 현재 완료=${currentCompletedToday}, 다음 완료=${newCompletedToday}`);

    // 4. 배지 획득 조건 검사
    const newlyEarnedBadgeIds: string[] = [];
    const badgesToUpdateInSet = new Set<string>();

    // 오늘의 영웅 배지 체크 (오늘 할당량 모두 완료)
    const dailyHeroBadgeId = "daily_hero";
    let willEarnDailyHero = false;
    
    // 해당 날짜에 아직 오늘의 영웅 배지가 없고, 모든 미션이 완료되는 경우에만 획득
    if (
      !alreadyHasDailyHeroToday &&
      actualTotalMissions && actualTotalMissions > 0 &&
      newCompletedToday >= actualTotalMissions &&
      currentCompletedToday < actualTotalMissions
    ) {
      console.log("🎉 Predicted badge earn: 오늘의 영웅");
      newlyEarnedBadgeIds.push(dailyHeroBadgeId);
      willEarnDailyHero = true;
    } else if (actualTotalMissions && newCompletedToday < actualTotalMissions) {
      console.log(`[addLog] 오늘의 영웅 조건 미충족: ${newCompletedToday}/${actualTotalMissions}`);
    }

    // 도전과제 체크를 위한 예측 값 계산
    // 오늘의 영웅을 획득하면 dailyHeroCount가 1 증가
    const newDailyHeroCount = willEarnDailyHero ? dailyHeroCount + 1 : dailyHeroCount;
    // 주간 미션 달성은 미션 완료 시 바로 체크되지 않음 (별도 플로우)
    const newWeeklyStreakCount = weeklyStreakCount;

    // 사용자 정의 및 공용 도전과제 체크
    for (const challenge of userChallenges) {
      let shouldEarn = false;

      switch (challenge.condition_type) {
        case "DAILY_COMPLETIONS_REPEATABLE": {
          const targetCount = getRepeatableTargetCount(
            newDailyHeroCount,
            challenge.required_count
          );
          const currentEarnedCount =
            repeatableBadgeEarnedCounts[challenge.badge_id] || 0;
          if (targetCount > currentEarnedCount) {
            shouldEarn = true;
          }
          break;
        }
        case "DAILY_COMPLETIONS":
          // 이미 획득한 배지는 스킵
          if (previouslyEarnedBadgeIds.has(challenge.badge_id)) {
            continue;
          }
          // 오늘의 영웅 배지 획득 횟수 체크
          if (newDailyHeroCount >= challenge.required_count) {
            shouldEarn = true;
          }
          break;
        case "WEEKLY_COMPLETIONS":
          // 이미 획득한 배지는 스킵
          if (previouslyEarnedBadgeIds.has(challenge.badge_id)) {
            continue;
          }
          // 주간 미션 달성 배지 획득 횟수 체크
          if (newWeeklyStreakCount >= challenge.required_count) {
            shouldEarn = true;
          }
          break;
      }

      if (shouldEarn) {
        console.log(`🎉 Predicted badge earn: ${challenge.name} (도전과제)`);
        newlyEarnedBadgeIds.push(challenge.badge_id);
        if (isRepeatableChallenge(challenge.condition_type)) {
          // 반복 배지는 Set에 추가하지 않음 (횟수로 관리)
        } else {
          badgesToUpdateInSet.add(challenge.badge_id);
        }
      }
    }

    // --- DB 작업 시작 ---
    try {
      // 로그 존재 여부 사전 체크 제거 - INSERT 시도 후 실패 시 처리로 변경
      // (삭제 후 재완료 시 캐시/타이밍 문제 방지)

      // 4. 해당 날짜의 스냅샷 확인 및 생성 (과거 날짜에서 미션 완료 시)
      const { data: existingSnapshot, error: snapshotCheckError } = await supabase
        .from("daily_mission_snapshots")
        .select("id, total_missions_count")
        .eq("user_id", user.id)
        .eq("date", todayKSTString)
        .maybeSingle();

      if (snapshotCheckError) {
        console.error("Error checking snapshot:", snapshotCheckError);
      }

      // 스냅샷이 없으면 생성
      if (!existingSnapshot) {
        console.log(`[useMissionLogs] 해당 날짜(${todayKSTString})에 스냅샷 없음, 새로 생성`);
        
        // 같은 주의 다른 스냅샷에서 미션 목록 가져오기
        const dateObj = new Date(todayKSTString + 'T00:00:00Z');
        const dayOfWeek = dateObj.getUTCDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const mondayDate = new Date(dateObj);
        mondayDate.setUTCDate(dateObj.getUTCDate() + mondayOffset);
        const sundayDate = new Date(mondayDate);
        sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
        
        const mondayStr = mondayDate.toISOString().split('T')[0];
        const sundayStr = sundayDate.toISOString().split('T')[0];

        // 같은 주의 다른 스냅샷에서 미션 목록 가져오기
        const { data: weekSnapshots } = await supabase
          .from("daily_mission_snapshots")
          .select("missions_snapshot, total_missions_count")
          .eq("user_id", user.id)
          .gte("date", mondayStr)
          .lte("date", sundayStr)
          .not("missions_snapshot", "is", null)
          .order("date", { ascending: false })
          .limit(1);

        let missionsToUse: unknown[] = [];
        let totalCount = totalMissionsToday || 0;

        if (weekSnapshots && weekSnapshots.length > 0 && weekSnapshots[0].missions_snapshot) {
          missionsToUse = weekSnapshots[0].missions_snapshot;
          totalCount = weekSnapshots[0].total_missions_count || missionsToUse.length;
        } else {
          // 같은 주에 스냅샷이 없으면 현재 미션 목록 사용
          const { data: currentMissions } = await supabase
            .from("missions")
            .select("*")
            .eq("user_id", user.id)
            .order("order", { ascending: true });
          missionsToUse = currentMissions || [];
          totalCount = missionsToUse.length;
        }

        // 스냅샷 생성
        const { error: insertSnapshotError } = await supabase
          .from("daily_mission_snapshots")
          .insert({
            user_id: user.id,
            date: todayKSTString,
            missions_snapshot: missionsToUse,
            total_missions_count: totalCount,
            completed_missions_count: 0, // 새로 생성하므로 0
          });

        if (insertSnapshotError) {
          console.error("Error creating snapshot:", insertSnapshotError);
        } else {
          console.log(`[useMissionLogs] 스냅샷 생성 완료: ${todayKSTString}, 총 미션: ${totalCount}`);
        }
      }

      // 5. 로그 삽입 (INSERT 시도 후 실패하면 기존 로그 조회)
      let insertedLog = null;
      let isExistingLog = false;
      
      const { data: newLog, error: insertError } = await supabase
        .from("mission_logs")
        .insert({
          user_id: user.id,
          mission_id: missionId,
          completed_at: todayKSTString,
        })
        .select()
        .single();

      if (insertError) {
        console.log("[addLog] 로그 삽입 오류:", insertError.code, insertError.message);
        
        // 어떤 오류든 기존 로그가 있는지 조회 시도
        const { data: existingLog } = await supabase
          .from("mission_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("mission_id", missionId)
          .eq("completed_at", todayKSTString)
          .maybeSingle();
        
        if (existingLog) {
          console.log("[addLog] 기존 로그 발견, 사용:", existingLog.id);
          insertedLog = existingLog;
          isExistingLog = true;
          // 기존 로그이므로 배지 처리 스킵
          newlyEarnedBadgeIds.length = 0;
        } else {
          // 로그가 없는데 삽입도 실패한 경우 - 재시도
          console.log("[addLog] 기존 로그 없음, 삽입 재시도...");
          const { data: retryLog, error: retryError } = await supabase
            .from("mission_logs")
            .insert({
              user_id: user.id,
              mission_id: missionId,
              completed_at: todayKSTString,
            })
            .select()
            .single();
          
          if (retryError) {
            console.error("[addLog] 재시도 실패:", retryError);
            throw retryError;
          }
          insertedLog = retryLog;
          console.log("[addLog] 재시도 성공:", insertedLog?.id);
        }
      } else {
        insertedLog = newLog;
        console.log("[addLog] 새 로그 삽입 성공:", insertedLog?.id);
      }

      if (!insertedLog) {
        isAddingLogRef.current = false;
        setIsAddingLog(false);
        return null;
      }

      // 6. 스냅샷 카운트 증가 RPC 호출 (기존 로그가 아닌 경우만)
      if (!isExistingLog) {
        const { error: incrementError } = await supabase.rpc(
          "increment_completed_count",
          {
            snapshot_user_id: user.id,
            snapshot_date: todayKSTString,
          }
        );
        if (incrementError) {
          // 에러 로깅만 하고 진행
          console.error("Error incrementing snapshot count:", incrementError);
        }
      } else {
        console.log("[addLog] 기존 로그이므로 스냅샷 카운트 증가 스킵");
      }

      // 획득한 배지를 DB에 직접 저장 (badge_type을 명시적으로 "mission"으로 설정)
      if (newlyEarnedBadgeIds.length > 0) {
        console.log(
          "[useMissionLogs] 획득한 배지 저장 시작:",
          newlyEarnedBadgeIds
        );

        // 일반 배지와 daily_hero 배지 분리
        const dailyHeroBadgeIds = newlyEarnedBadgeIds.filter(
          (id) => id === "daily_hero"
        );
        const otherBadgeIds = newlyEarnedBadgeIds.filter(
          (id) => id !== "daily_hero"
        );

        // 1. 일반 배지 저장
        if (otherBadgeIds.length > 0) {
          const otherBadges = otherBadgeIds.map((badgeId) => ({
            user_id: user.id,
            badge_id: badgeId,
            badge_type: "mission", // 명시적으로 badge_type 설정
            earned_at: new Date().toISOString(),
          }));

          const { data: otherData, error: otherError } = await supabase
            .from("earned_badges")
            .insert(otherBadges)
            .select();

          if (otherError) {
            console.error("[useMissionLogs] 일반 배지 저장 오류:", otherError);
          } else {
            console.log("[useMissionLogs] 일반 배지 저장 성공:", otherData);
          }
        }

        // 2. daily_hero 배지 저장 (직접 RPC 사용)
        if (dailyHeroBadgeIds.length > 0) {
          try {
            console.log("[useMissionLogs] 오늘의 영웅 배지 저장 시작");

            // RPC 함수 사용 시도
            const { data: rpcData, error: rpcError } = await supabase.rpc(
              "insert_badge_with_type",
              {
                p_user_id: user.id,
                p_badge_id: "daily_hero",
                p_badge_type: "mission",
              }
            );

            if (rpcError) {
              console.error(
                "[useMissionLogs] RPC 저장 실패, 직접 저장 시도:",
                rpcError
              );

              // 실패하면 직접 저장 시도
              const { data: insertData, error: insertError } = await supabase
                .from("earned_badges")
                .insert({
                  user_id: user.id,
                  badge_id: "daily_hero",
                  badge_type: "mission", // 명시적 설정
                  earned_at: new Date().toISOString(),
                })
                .select();

              if (insertError) {
                console.error(
                  "[useMissionLogs] 오늘의 영웅 직접 저장 실패:",
                  insertError
                );
              } else {
                console.log(
                  "[useMissionLogs] 오늘의 영웅 직접 저장 성공:",
                  insertData
                );
              }
            } else {
              console.log(
                "[useMissionLogs] RPC로 오늘의 영웅 배지 저장 성공:",
                rpcData
              );
            }

            // 최종 저장 상태 확인
            const { data: verifyData } = await supabase
              .from("earned_badges")
              .select("*")
              .eq("user_id", user.id)
              .eq("badge_id", "daily_hero")
              .order("earned_at", { ascending: false })
              .limit(1);

            if (verifyData && verifyData.length > 0) {
              console.log(
                "[useMissionLogs] 최종 저장된 배지 확인:",
                verifyData[0]
              );
            }
          } catch (err) {
            console.error(
              "[useMissionLogs] 배지 저장 과정에서 예외 발생:",
              err
            );
          }
        }
      }

      // --- DB 작업 성공 후 상태 업데이트 및 알림 ---

      // 6. 알림 표시 (예측된 모든 배지 동시 추가)
      if (newlyEarnedBadgeIds.length > 0) {
        console.log(
          `🔔 Queueing all earned badges simultaneously: ${newlyEarnedBadgeIds.join(
            ", "
          )}`
        );

        for (const badgeId of newlyEarnedBadgeIds) {
          const badgeNames: Record<string, string> = {
            ten_missions_completed: "열정가득",
            daily_hero: "오늘의 영웅",
            first_mission_completed: "첫 도전",
            mission_150_completed: "꾸준한 도전자",
            every_mission_100: "100층집 단골손님",
          };
          console.log(
            `🔔 Queueing: ${badgeId} (${badgeNames[badgeId] || badgeId})`
          );
          showBadgeNotification(badgeId);
        }
      }

      // 7. 상태 업데이트 (함수형 업데이트 사용)
      setLogs((prevLogs) => [...prevLogs, insertedLog]);
      setCompletedTodayCount((prevCount) => prevCount + 1);
      setTotalCompletedCount((prevCount) => (prevCount ?? 0) + 1);
      setWeeklyCompletedCount((prevCount) => prevCount + 1);
      // 오늘의 영웅 배지를 획득했다면 카운트 증가
      if (willEarnDailyHero) {
        setDailyHeroCount((prevCount) => prevCount + 1);
      }
      // 이전에 획득한 배지 Set 업데이트 (1회성 도전과제)
      if (badgesToUpdateInSet.size > 0) {
        setPreviouslyEarnedBadgeIds((prevSet) => {
          const newSet = new Set(prevSet);
          badgesToUpdateInSet.forEach((id) => newSet.add(id));
          return newSet;
        });
      }
      // 반복 달성 배지 횟수 업데이트
      const earnedRepeatableBadgeIds = newlyEarnedBadgeIds.filter((badgeId) =>
        userChallenges.some(
          (c) =>
            c.badge_id === badgeId &&
            isRepeatableChallenge(c.condition_type)
        )
      );
      if (earnedRepeatableBadgeIds.length > 0) {
        setRepeatableBadgeEarnedCounts((prevCounts) => {
          const nextCounts = { ...prevCounts };
          earnedRepeatableBadgeIds.forEach((badgeId) => {
            nextCounts[badgeId] = (nextCounts[badgeId] || 0) + 1;
          });
          return nextCounts;
        });
      }

      playSound("/sound/high_rune.flac");

      isAddingLogRef.current = false;
      setIsAddingLog(false);
      return insertedLog;
    } catch (err: unknown) {
      console.error("Error adding mission log:", err);
      setError("미션 기록 추가 중 오류가 발생했습니다.");
      isAddingLogRef.current = false;
      setIsAddingLog(false);
      return null;
    }
  };

  // deleteLog 함수 - 상태 업데이트 로직 추가 (함수형 업데이트 사용)
  const deleteLog = async (logId: string) => {
    if (!user || !formattedDate) return;
    try {
      // 1. 삭제 전 해당 로그 정보 가져오기 (스냅샷 업데이트에 필요)
      const { data: logData, error: logError } = await supabase
        .from("mission_logs")
        .select("mission_id")
        .eq("id", logId)
        .single();

      if (logError) throw logError;
      if (!logData) {
        console.error("로그 정보를 찾을 수 없습니다:", logId);
        return;
      }

      // 2. DB에서 로그 삭제 (id로 삭제)
      const { error: deleteError } = await supabase
        .from("mission_logs")
        .delete()
        .eq("id", logId);

      if (deleteError) throw deleteError;

      // --- 삭제 성공 시 클라이언트 상태 업데이트 (함수형 업데이트) ---
      setLogs((prevLogs) => prevLogs.filter((log) => log.id !== logId));

      // 카운트 감소 (null 체크 및 0 미만 방지)
      setTotalCompletedCount((prevCount) => Math.max(0, (prevCount ?? 0) - 1));
      setCompletedTodayCount((prevCount) => Math.max(0, prevCount - 1));
      setWeeklyCompletedCount((prevCount) => Math.max(0, prevCount - 1));

      console.log("[deleteLog] States updated after deletion.");

      // 3. 스냅샷 카운트 감소
      const { error: decrementError } = await supabase.rpc(
        "decrement_completed_count",
        {
          snapshot_user_id: user.id,
          snapshot_date: formattedDate,
        }
      );
      if (decrementError) {
        console.error("Error decrementing snapshot count:", decrementError);
      }
    } catch (err: unknown) {
      console.error("Error deleting mission log:", err);
      setError("미션 기록 삭제 중 오류가 발생했습니다.");
    }
  };

  return { logs, loading, error, fetchLogs, addLog, deleteLog, isAddingLog };
};
