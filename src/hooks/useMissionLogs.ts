import { useState, useEffect, useCallback } from "react";
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

export const useMissionLogs = (formattedDate: string) => {
  const { user } = useAuth();
  const { showBadgeNotification } = useNotification();
  const [logs, setLogs] = useState<MissionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 오늘 완료된 로그 수 상태 추가 (예측용)
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  // 전체 완료 로그 수 상태 추가 (예측용)
  const [totalCompletedCount, setTotalCompletedCount] = useState<number | null>(
    null
  );
  // 오늘 필요한 총 미션 수 상태 추가 (예측용)
  const [totalMissionsToday, setTotalMissionsToday] = useState<number | null>(
    null
  );
  // 이전에 획득한 배지 ID 목록 상태 추가 (예측용, Set 사용) - 최초 획득 확인용
  const [previouslyEarnedBadgeIds, setPreviouslyEarnedBadgeIds] = useState<
    Set<string>
  >(new Set());

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

      // Fetch total mission count for today
      // 이 값은 자주 변하지 않으므로 별도 훅이나 컨텍스트에서 관리하는 것이 더 효율적일 수 있음
      const { count: missionsCount, error: missionsError } = await supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (missionsError) throw missionsError;
      setTotalMissionsToday(missionsCount ?? 0);
      console.log(
        `[useMissionLogs] Initial totalMissionsToday: ${missionsCount}`
      );

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

      // Fetch previously earned one-time badges ('첫 도전', '열정 가득')
      // 실제 badge_id는 challenges 테이블 확인 후 정확히 기입해야 함
      const oneTimeBadgeIds = [
        "first_mission_completed",
        "ten_missions_completed",
      ]; // 예시 ID
      const { data: earnedBadgesData, error: earnedBadgesError } =
        await supabase
          .from("earned_badges")
          .select("badge_id")
          .eq("user_id", user.id)
          .in("badge_id", oneTimeBadgeIds);

      if (earnedBadgesError) throw earnedBadgesError;
      const earnedSet = new Set(earnedBadgesData?.map((b) => b.badge_id) || []);
      setPreviouslyEarnedBadgeIds(earnedSet);
      console.log(
        "[useMissionLogs] Initial previouslyEarnedBadgeIds:",
        earnedSet
      );
    } catch (err: unknown) {
      console.error("Error fetching initial data for badge prediction:", err);
      setError("초기 데이터 로딩 중 오류 발생");
    } finally {
      setLoading(false); // 초기 데이터 로딩 완료
    }
  }, [user, formattedDate]);

  // 컴포넌트 마운트 또는 사용자/날짜 변경 시 초기 데이터 로드
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const addLog = async (missionId: string) => {
    if (!user || !formattedDate) return null;

    // 상태 로드 확인 (totalMissionsToday는 null일 수 있음)
    if (totalMissionsToday === null) {
      console.warn("[addLog] totalMissionsToday state not loaded yet.");
      return null;
    }

    // 1. 현재 상태 스냅샷 (badge 체크 로직 이동을 위해 필요)
    const currentCompletedToday = completedTodayCount;
    const currentTotalCompleted = totalCompletedCount ?? 0;

    // 2. 다음 상태 예측
    const newCompletedToday = currentCompletedToday + 1;
    const newTotalCompleted = currentTotalCompleted + 1;

    // 3. 배지 획득 조건 한 번에 검사
    const newlyEarnedBadgeIds: string[] = []; // 이번에 획득한 배지 IDs
    const badgesToUpdateInSet = new Set<string>(); // 상태 업데이트 시 previouslyEarnedBadgeIds에 추가할 배지들

    // 첫 도전 배지 체크
    const firstMissionBadgeId = "first_mission_completed";
    if (
      newTotalCompleted === 1 &&
      !previouslyEarnedBadgeIds.has(firstMissionBadgeId)
    ) {
      console.log("🎉 Predicted badge earn: 첫 도전");
      newlyEarnedBadgeIds.push(firstMissionBadgeId);
      badgesToUpdateInSet.add(firstMissionBadgeId);
    }

    // 열정 가득 배지 체크 (10개 완료)
    const passionBadgeId = "ten_missions_completed";
    if (
      newTotalCompleted >= 10 &&
      !previouslyEarnedBadgeIds.has(passionBadgeId)
    ) {
      console.log("🎉 Predicted badge earn: 열정 가득");
      newlyEarnedBadgeIds.push(passionBadgeId);
      badgesToUpdateInSet.add(passionBadgeId);
    }

    // 오늘의 영웅 배지 체크 (오늘 할당량 모두 완료)
    const dailyHeroBadgeId = "daily_hero";
    if (
      totalMissionsToday > 0 &&
      newCompletedToday >= totalMissionsToday &&
      currentCompletedToday < totalMissionsToday
    ) {
      console.log("🎉 Predicted badge earn: 오늘의 영웅");
      // 오늘의 영웅은 반복 획득 가능하므로 previouslyEarnedBadgeIds에 추가하지 않음
      newlyEarnedBadgeIds.push(dailyHeroBadgeId);
    }

    // --- DB 작업 시작 ---
    try {
      const todayKSTString = formattedDate;

      // 로그 존재 여부 확인
      const { error: checkError, count: existingLogCount } = await supabase
        .from("mission_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("mission_id", missionId)
        .eq("completed_at", todayKSTString);

      if (checkError) throw checkError;
      if (existingLogCount && existingLogCount > 0) {
        console.log("[useMissionLogs] Log already exists.");
        return null;
      }

      // 4. 로그 삽입
      const { data: insertedLog, error: insertError } = await supabase
        .from("mission_logs")
        .insert({
          user_id: user.id,
          mission_id: missionId,
          completed_at: todayKSTString,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedLog) return null;

      // 5. 스냅샷 카운트 증가 RPC 호출 (성공 여부 중요하지 않음)
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
          console.log(
            `🔔 Queueing: ${badgeId} (${
              badgeId === "ten_missions_completed"
                ? "열정가득"
                : badgeId === "daily_hero"
                ? "오늘의 영웅"
                : "첫 도전"
            })`
          );
          showBadgeNotification(badgeId);
        }
      }

      // 7. 상태 업데이트 (함수형 업데이트 사용)
      setLogs((prevLogs) => [...prevLogs, insertedLog]);
      setCompletedTodayCount((prevCount) => prevCount + 1);
      setTotalCompletedCount((prevCount) => (prevCount ?? 0) + 1);
      // 이전에 획득한 배지 Set 업데이트 (필요한 경우)
      if (badgesToUpdateInSet.size > 0) {
        setPreviouslyEarnedBadgeIds((prevSet) => {
          const newSet = new Set(prevSet);
          badgesToUpdateInSet.forEach((id) => newSet.add(id));
          return newSet;
        });
      }

      playSound("/sound/high_rune.flac");

      return insertedLog;
    } catch (err: unknown) {
      console.error("Error adding mission log:", err);
      setError("미션 기록 추가 중 오류가 발생했습니다.");
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

  return { logs, loading, error, fetchLogs, addLog, deleteLog };
};
