import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { supabase } from "../lib/supabaseClient"; // Supabase 클라이언트 직접 사용
import { useAuth } from "../contexts/AuthContext"; // 사용자 정보 가져오기
import { useMissions } from "../hooks/useMissions";
import { useMissionLogs } from "../hooks/useMissionLogs";
import { useDailySnapshot } from "../hooks/useDailySnapshot"; // 과거 날짜 스냅샷 훅 추가
import { useWeeklyCompletionStatus } from "../hooks/useWeeklyCompletionStatus"; // 주간 현황 훅 임포트
import WeeklyStatusDisplay from "../components/WeeklyStatusDisplay"; // 주간 현황 컴포넌트 임포트
import ConfettiEffect from "../components/ConfettiEffect";
import { Mission } from "../types"; // Mission 타입만 가져오기
import { toZonedTime, format } from "date-fns-tz"; // date-fns-tz import
import {
  LuCheck,
  LuGift,
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuPencil,
} from "react-icons/lu";
import { toast } from "react-hot-toast";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Chip from "../components/ui/Chip";
import Modal from "../components/ui/Modal";
import ProgressBar from "../components/ui/ProgressBar";
import Spinner from "../components/ui/Spinner";

const TodayMissionPage: React.FC = () => {
  const { user, timeZone } = useAuth(); // 사용자 정보 가져오기

  // 오늘 날짜를 KST 기준으로 설정
  const todayKSTObj = useMemo(
    () => toZonedTime(new Date(), timeZone),
    [timeZone]
  );
  const formattedTodayKST = useMemo(
    () => format(todayKSTObj, "yyyy-MM-dd", { timeZone }),
    [todayKSTObj, timeZone]
  );

  // 선택된 날짜 상태 추가 (기본값: 오늘)
  const [selectedDate, setSelectedDate] = useState<string>(
    formattedTodayKST
  );
  const [showDatePicker, setShowDatePicker] =
    useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // 선택된 날짜가 오늘인지 확인
  const isToday = useMemo(
    () => selectedDate === formattedTodayKST,
    [selectedDate, formattedTodayKST]
  );

  // formattedTodayKST가 변경되면 selectedDate도 업데이트 (앱 시작 시)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && formattedTodayKST) {
      initializedRef.current = true;
      setSelectedDate(formattedTodayKST);
    }
  }, [formattedTodayKST]);

  const {
    missions,
    loading: missionsLoading,
    error: missionsError,
    fetchMissions,
  } = useMissions();

  // 선택된 날짜의 스냅샷 가져오기 (과거 날짜용)
  const {
    snapshot: dailySnapshot,
    loading: snapshotLoading,
    error: snapshotError,
    fallbackMissions, // 같은 주의 다른 날짜에서 가져온 미션 목록
    totalMissionsCount: snapshotTotalMissions, // 스냅샷/폴백에서 가져온 총 미션 수
  } = useDailySnapshot(selectedDate);

  // 선택된 날짜의 총 미션 수 계산
  // 오늘이면 현재 missions 배열의 길이, 과거 날짜면 스냅샷에서 가져온 값
  const totalMissionsForDate = useMemo(() => {
    if (isToday) {
      return missions?.length || 0;
    }
    return snapshotTotalMissions || 0;
  }, [isToday, missions, snapshotTotalMissions]);

  const {
    logs,
    loading: logsLoading,
    error: logsError,
    addLog,
    deleteLog,
    fetchLogs,
    isAddingLog, // 로그 추가 중 상태 (중복 클릭 방지용)
  } = useMissionLogs(selectedDate, totalMissionsForDate);
  const {
    weekStatus,
    loading: weekStatusLoading,
    error: weekStatusError,
    refetch: refetchWeeklyStatus,
  } = useWeeklyCompletionStatus(); // 주간 현황 데이터 로드

  const [showConfetti, setShowConfetti] = useState(false);
  // const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [snapshotChecked, setSnapshotChecked] =
    useState(false); // 스냅샷 확인/생성 완료 여부
  const isSnapshotCheckRunning = useRef(false); // 스냅샷 체크 중복 실행 방지 플래그

  // 사용자 정보 상태
  const [childName, setChildName] =
    useState<string>("고운이");
  const [weeklyRewardGoal, setWeeklyRewardGoal] =
    useState<string>(
      "이번주에 미션을 모두 달성해서 하고 싶은 것"
    );
  const [showRewardModal, setShowRewardModal] =
    useState(false);
  const [editingReward, setEditingReward] = useState("");
  const [savingReward, setSavingReward] = useState(false);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("user_info")
          .select("child_name, weekly_reward_goal")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error(
            "사용자 정보를 가져오는 중 오류가 발생했습니다:",
            error
          );
        } else if (data) {
          if (data.child_name)
            setChildName(data.child_name);
          if (data.weekly_reward_goal)
            setWeeklyRewardGoal(data.weekly_reward_goal);
        }
      } catch (err) {
        console.error(
          "사용자 정보 조회 중 오류가 발생했습니다:",
          err
        );
      }
    };

    fetchUserInfo();
  }, [user]);

  // --- 스냅샷 확인 및 생성 로직 수정 (오늘 날짜일 때만) --- //
  useEffect(() => {
    // 사용자 로드 완료, 미션 로드 완료, 아직 스냅샷 확인 전, 중복 실행 중 아닐 때만 실행
    // 오늘 날짜일 때만 스냅샷 생성 로직 실행
    if (
      user &&
      !missionsLoading &&
      !snapshotChecked &&
      !isSnapshotCheckRunning.current &&
      isToday
    ) {
      isSnapshotCheckRunning.current = true; // 실행 시작 플래그
      console.log(
        "[Snapshot Effect] Conditions met, starting check..."
      );

      const checkAndCreateSnapshot = async () => {
        try {
          // 미션 데이터가 실제로 로드되었는지 다시 확인 (missionsLoading만으로는 부족할 수 있음)
          if (missions === null || missions.length === 0) {
            console.log(
              "[Snapshot Check] No missions loaded yet or empty, skipping."
            );
            // 미션이 없으면 스냅샷 의미 없음, 체크 완료로 간주
            setSnapshotChecked(true);
            isSnapshotCheckRunning.current = false;
            return;
          }

          // 1. 오늘 날짜(KST)의 스냅샷 확인
          console.log(
            `[Snapshot Check] Checking for snapshot on ${formattedTodayKST} for user ${user.id}`
          );
          const {
            data: existingSnapshot,
            error: checkError,
          } = await supabase
            .from("daily_mission_snapshots")
            .select("id", { count: "exact" }) // count만 가져와도 됨
            .eq("user_id", user.id)
            // KST 기준 날짜 문자열로 비교
            .eq("date", formattedTodayKST)
            .limit(1); // 하나만 찾으면 됨

          if (checkError) throw checkError;

          // 2. 스냅샷 없으면 생성
          if (
            !existingSnapshot ||
            existingSnapshot.length === 0
          ) {
            console.log(
              `[Snapshot Create] No existing snapshot found. Creating for ${formattedTodayKST}`
            );
            const { error: insertError } = await supabase
              .from("daily_mission_snapshots")
              .insert({
                user_id: user.id,
                // KST 기준 날짜 문자열 사용
                date: formattedTodayKST,
                missions_snapshot: missions,
                total_missions_count: missions.length,
                completed_missions_count: 0,
              });

            if (insertError) throw insertError;
            console.log(
              `[Snapshot Create] Snapshot created successfully for ${formattedTodayKST}`
            );
          } else {
            console.log(
              `[Snapshot Check] Snapshot already exists for ${formattedTodayKST}`
            );
          }
          setSnapshotChecked(true); // 확인/생성 완료
        } catch (err) {
          console.error(
            "[Snapshot Check/Create Error]:",
            err
          );
          setSnapshotChecked(true); // 에러 발생 시에도 완료로 처리 (무한 루프 방지)
        } finally {
          isSnapshotCheckRunning.current = false; // 실행 종료 플래그
        }
      };

      checkAndCreateSnapshot();
    }
    // 의존성 배열에 formattedTodayKST, isToday 추가
  }, [
    user,
    missionsLoading,
    snapshotChecked,
    formattedTodayKST,
    missions,
    isToday,
  ]);
  // --- 스냅샷 로직 끝 --- //

  // 날짜 선택기 외부 클릭 시 닫기
  useEffect(() => {
    // pointerdown: 마우스/터치(태블릿) 모두 처리
    const handleClickOutside = (event: PointerEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(
          event.target as Node
        )
      ) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener(
        "pointerdown",
        handleClickOutside
      );
    }

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleClickOutside
      );
    };
  }, [showDatePicker]);

  // Load celebration sound (변경 없음)
  // useEffect(() => {
  //   // You should host your own celebration sound or find a royalty-free one
  //   // Example path, replace with your actual sound file path
  //   const celebrationSound = new Audio("/sound/high_rune.flac");
  //   celebrationSound.preload = "auto";
  //   setAudio(celebrationSound);

  //   // Clean up audio element on unmount
  //   return () => {
  //     if (celebrationSound) {
  //       celebrationSound.pause();
  //       celebrationSound.src = ""; // Release resource
  //     }
  //   };
  // }, []);

  // 요일을 한국어로 변환
  const getWeekdayString = (date: Date) => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[date.getDay()];
  };

  // 미션 상태 토글 처리 함수
  const handleToggleComplete = async (mission: Mission) => {
    if (!user) return;
    try {
      // 로딩 중이거나 로그 추가 중이면 중복 실행 방지
      if (missionsLoading || logsLoading || isAddingLog) {
        console.log("중복 클릭 방지: 이미 작업 중입니다.");
        return;
      }

      const missionToUpdate = missionsWithStatus.find(
        (m) => m.id === mission.id
      );
      if (!missionToUpdate) return;

      console.log(
        "미션 토글:",
        missionToUpdate.content,
        "현재 상태:",
        missionToUpdate.is_completed_today
      );

      if (missionToUpdate.is_completed_today) {
        // 이미 완료된 미션이면 로그 삭제
        if (missionToUpdate.log_id) {
          // 로그 ID가 있는 경우에만 삭제 시도
          console.log(
            "삭제할 로그 ID:",
            missionToUpdate.log_id
          );
          await deleteLog(missionToUpdate.log_id);
          console.log("로그 삭제 완료");
          // 로컬 상태 업데이트
          await fetchLogs(); // 로그 목록 다시 가져오기
        }
      } else {
        // 완료되지 않은 미션이면 로그 추가
        await addLog(mission.id);
        console.log("로그 추가 완료");

        // // 효과음 재생
        // if (audio) {
        //   audio.currentTime = 0;
        //   audio.play().catch((e) => console.error("Audio play error:", e));
        // }

        // 폭죽 효과 표시
        setShowConfetti(true);
        // 로그 목록 다시 가져오기
        await fetchLogs();

        // 주간 상태 다시 체크 (주간 미션 달성 여부 확인)
        setTimeout(() => {
          refetchWeeklyStatus();
        }, 500); // 스냅샷 업데이트 후 주간 상태 체크
      }
    } catch (error) {
      console.error("미션 상태 변경 중 오류 발생:", error);
      // 오류 발생 시 원래 상태로 되돌림
      await fetchMissions();
      await fetchLogs();
    }
  };

  // 폭죽 완료 후 처리
  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  // 로딩 상태 통합 체크
  const isLoading =
    missionsLoading ||
    logsLoading ||
    weekStatusLoading ||
    (!isToday && snapshotLoading);

  // 에러 상태 통합 체크
  const error =
    missionsError ||
    logsError ||
    weekStatusError ||
    snapshotError;

  // 선택된 날짜의 미션 목록 가져오기 (오늘이면 missions, 과거면 스냅샷 또는 폴백)
  const selectedDateMissions = useMemo((): Mission[] => {
    if (isToday) {
      return missions || [];
    } else {
      // 과거 날짜: 스냅샷에서 미션 목록 가져오기
      // 스냅샷이 있고 미션이 있으면 사용
      if (
        dailySnapshot?.missions_snapshot &&
        dailySnapshot.missions_snapshot.length > 0
      ) {
        return dailySnapshot.missions_snapshot;
      }
      // 스냅샷이 없거나 미션이 비어있으면 폴백 미션 사용 (같은 주 또는 현재 미션)
      if (fallbackMissions && fallbackMissions.length > 0) {
        return fallbackMissions;
      }
      return [];
    }
  }, [isToday, missions, dailySnapshot, fallbackMissions]);

  // 미션 데이터와 로그 데이터 결합
  const missionsWithStatus = useMemo(() => {
    if (!selectedDateMissions || !logs) return [];

    return selectedDateMissions.map((mission) => {
      // 해당 날짜에 완료된 로그 찾기
      const completedLog = logs.find(
        (log) => log.mission_id === mission.id
      );

      return {
        ...mission,
        is_completed_today: !!completedLog,
        log_id: completedLog?.id,
      };
    });
  }, [selectedDateMissions, logs]);

  // 주간 보상 목표 저장 함수
  const saveWeeklyRewardGoal = async () => {
    if (!user) return;

    try {
      setSavingReward(true);

      const { error } = await supabase
        .from("user_info")
        .update({
          weekly_reward_goal: editingReward,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setWeeklyRewardGoal(editingReward);
      setShowRewardModal(false);
      toast.success("주간 목표가 저장되었습니다.");
    } catch (err) {
      console.error(
        "주간 목표 저장 중 오류가 발생했습니다:",
        err
      );
      toast.error("주간 목표 저장에 실패했습니다.");
    } finally {
      setSavingReward(false);
    }
  };

  // 보상 수정 모달 열기
  const openRewardModal = () => {
    setEditingReward(weeklyRewardGoal);
    setShowRewardModal(true);
  };

  // 날짜를 하루 앞/뒤로 이동 (delta: -1 이전, 1 다음)
  const shiftSelectedDate = (delta: -1 | 1) => {
    const base = new Date(selectedDate + "T00:00:00Z");
    base.setUTCDate(base.getUTCDate() + delta);
    const newDateStr = format(toZonedTime(base, "UTC"), "yyyy-MM-dd", {
      timeZone: "UTC",
    });
    if (delta === 1 && newDateStr > formattedTodayKST) return;
    setSelectedDate(newDateStr);
  };

  const completedCount = missionsWithStatus.filter(
    (m) => m.is_completed_today
  ).length;
  const totalCount = missionsWithStatus.length;

  const selectedDateObj = toZonedTime(
    new Date(selectedDate + "T00:00:00Z"),
    timeZone
  );

  return (
    <div className="px-1 sm:px-2 py-2">
      <ConfettiEffect
        run={showConfetti}
        recycle={false}
        onComplete={handleConfettiComplete}
      />

      <PageHeader
        title={childName || "우리 아이의 방울방울 미션 챌린지"}
        actions={
          <div className="relative" ref={datePickerRef}>
            {/* 날짜 표시 영역 - 누르면 달력 표시 */}
            <Button
              onClick={() => setShowDatePicker(!showDatePicker)}
              aria-expanded={showDatePicker}
              aria-haspopup="dialog"
              className="text-left"
            >
              <LuCalendar size={20} className="flex-none" />
              <span className="flex flex-wrap items-center gap-x-2">
                <span>
                  {format(selectedDateObj, "yyyy년 M월 d일", { timeZone })}
                </span>
                <span className="font-semibold ui-text-sub">
                  {getWeekdayString(selectedDateObj)}요일
                </span>
                {!isToday && <Chip tone="warning">과거 날짜</Chip>}
              </span>
            </Button>

            {/* 날짜 선택 팝업 */}
            {showDatePicker && (
              <div
                className="ui-card absolute right-0 top-full mt-3 z-50 w-72"
                role="dialog"
                aria-label="날짜 선택"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg">날짜 선택</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(formattedTodayKST);
                      setShowDatePicker(false);
                    }}
                  >
                    오늘
                  </Button>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  max={formattedTodayKST}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowDatePicker(false);
                  }}
                  className="w-full"
                  aria-label="날짜 직접 선택"
                />
                {/* 빠른 날짜 이동 버튼 */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="soft"
                    size="sm"
                    className="flex-1"
                    onClick={() => shiftSelectedDate(-1)}
                  >
                    <LuChevronLeft size={16} />
                    이전
                  </Button>
                  <Button
                    variant="soft"
                    size="sm"
                    className="flex-1"
                    onClick={() => shiftSelectedDate(1)}
                    disabled={selectedDate >= formattedTodayKST}
                  >
                    다음
                    <LuChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* 주간 보상 목표 표시 (누르면 수정) */}
      <button
        type="button"
        onClick={openRewardModal}
        className="ui-card w-full text-left flex items-center gap-4 mb-6 cursor-pointer"
        aria-label="이번주 보상 수정"
      >
        <span
          className="inline-flex items-center justify-center flex-none"
          style={{
            width: 52,
            height: 52,
            backgroundColor: "var(--ui-accent)",
            color: "var(--ui-on-accent)",
            border: "var(--ui-bw) solid var(--ui-ink)",
            borderRadius: "var(--ui-radius-md)",
          }}
          aria-hidden="true"
        >
          <LuGift size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block ui-text-sub text-sm font-bold">이번주 보상</span>
          <span className="block text-lg sm:text-2xl font-extrabold break-words">
            {weeklyRewardGoal}
          </span>
        </span>
        <LuPencil size={20} className="flex-none ui-text-sub" aria-hidden="true" />
      </button>

      {/* 주간 보상 편집 모달 */}
      <Modal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        ariaLabel="주간 보상 설정"
      >
        <div className="text-center">
          <h2 className="text-xl mb-2">주간 보상 설정</h2>
          <p className="ui-text-sub font-medium mb-4">
            이번 주 미션을 모두 달성했을 때 받고 싶은 보상을 입력하세요.
          </p>

          <textarea
            value={editingReward}
            onChange={(e) => setEditingReward(e.target.value)}
            className="w-full mb-4"
            rows={3}
            placeholder="예: 김밥 싸서 먹기, 맛있는 디저트 먹기, 새 책 사기"
            aria-label="주간 보상"
          />

          <Button
            variant="primary"
            block
            onClick={saveWeeklyRewardGoal}
            loading={savingReward}
          >
            {!savingReward && <LuCheck size={20} />}
            저장하기
          </Button>
        </div>
      </Modal>

      {isLoading && <Spinner label="데이터 로딩 중..." />}
      {error && (
        <p role="alert" className="ui-error-text mb-4">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 w-full min-w-0">
            {/* 진행 상황 */}
            {totalCount > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 font-extrabold">
                  <span>{isToday ? "오늘의 미션" : "이날의 미션"}</span>
                  <span aria-live="polite">
                    {completedCount} / {totalCount} 완료
                  </span>
                </div>
                <ProgressBar
                  value={completedCount / totalCount}
                  label="미션 진행률"
                />
              </div>
            )}

            {missionsWithStatus.length === 0 && (
              <Card className="text-center font-semibold ui-text-sub">
                {isToday
                  ? '아직 설정된 미션이 없어요! "오늘의 미션 설정"에서 오늘의 미션을 만들어 보세요.'
                  : "이 날짜에는 등록된 미션이 없어요. 미션 설정에서 새로운 미션을 추가해보세요."}
              </Card>
            )}

            <ul className="space-y-4">
              {missionsWithStatus.map((mission) => {
                const done = mission.is_completed_today;
                return (
                  <li key={mission.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(mission)}
                      aria-pressed={done}
                      className="ui-card w-full flex items-center gap-4 text-left cursor-pointer transition-transform active:translate-y-[3px]"
                      style={{
                        padding: "1rem 1.1rem",
                        backgroundColor: done
                          ? "var(--ui-accent-soft)"
                          : "var(--ui-surface)",
                        boxShadow: done ? "var(--ui-shadow-pressed)" : undefined,
                        transform: done ? "translateY(3px)" : undefined,
                      }}
                    >
                      <span
                        className="ui-check"
                        data-checked={done}
                        style={{ width: 40, height: 40 }}
                        aria-hidden="true"
                      >
                        {done && <LuCheck size={24} strokeWidth={3.5} />}
                      </span>
                      <span
                        className={`flex-1 min-w-0 break-words text-lg sm:text-xl font-extrabold ${
                          done ? "line-through" : ""
                        }`}
                        style={{
                          color: done ? "var(--ui-text-sub)" : "var(--ui-text)",
                          textDecorationThickness: "3px",
                        }}
                      >
                        {mission.content}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="w-full md:w-auto">
            <WeeklyStatusDisplay
              weekStatus={weekStatus}
              loading={weekStatusLoading}
              error={weekStatusError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayMissionPage;
