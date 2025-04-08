import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; // Supabase 클라이언트 직접 사용
import { useAuth } from '../contexts/AuthContext'; // 사용자 정보 가져오기
import { useMissions } from '../hooks/useMissions';
import { useMissionLogs } from '../hooks/useMissionLogs';
import { useWeeklyCompletionStatus } from '../hooks/useWeeklyCompletionStatus'; // 주간 현황 훅 임포트
import WeeklyStatusDisplay from '../components/WeeklyStatusDisplay'; // 주간 현황 컴포넌트 임포트
import ConfettiEffect from '../components/ConfettiEffect';
import { MissionWithLogs } from '../types'; // Combined type
// import { FaCheckCircle } from "react-icons/fa"; // 버튼 제거로 불필요
// import { LuCircle } from 'react-icons/lu'; // 버튼 제거로 불필요

// 날짜를 YYYY-MM-DD 형식으로 포맷
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 완료 시 적용할 파스텔 무지개 색상 배열 (배경색, 테두리색, 텍스트색)
const pastelRainbowColors = [
  { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },         // 빨
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' }, // 주
  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },// 노
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },   // 초
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },     // 파
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' }, // 남
  { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800' }, // 보
];

const TodayMissionPage: React.FC = () => {
  const { user } = useAuth(); // 사용자 정보 가져오기
  const today = useMemo(() => new Date(), []); // Get today's date once
  const formattedToday = useMemo(() => formatDate(today), [today]); // YYYY-MM-DD 형식

  const { missions, loading: missionsLoading, error: missionsError } = useMissions();
  const { logs, loading: logsLoading, error: logsError, addLog, deleteLog } = useMissionLogs(today);
  const { weekStatus, loading: weekStatusLoading, error: weekStatusError } = useWeeklyCompletionStatus(); // 주간 현황 데이터 로드

  const [showConfetti, setShowConfetti] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [snapshotChecked, setSnapshotChecked] = useState(false); // 스냅샷 확인/생성 완료 여부
  const isSnapshotCheckRunning = useRef(false); // 스냅샷 체크 중복 실행 방지 플래그

  // --- 스냅샷 확인 및 생성 로직 수정 --- //
  useEffect(() => {
    // 사용자 로드 완료, 미션 로드 완료, 아직 스냅샷 확인 전, 중복 실행 중 아닐 때만 실행
    if (user && !missionsLoading && !snapshotChecked && !isSnapshotCheckRunning.current) {
      isSnapshotCheckRunning.current = true; // 실행 시작 플래그
      console.log('[Snapshot Effect] Conditions met, starting check...');

      const checkAndCreateSnapshot = async () => {
        try {
          // 미션 데이터가 실제로 로드되었는지 다시 확인 (missionsLoading만으로는 부족할 수 있음)
          if (missions === null || missions.length === 0) {
             console.log('[Snapshot Check] No missions loaded yet or empty, skipping snapshot creation for now.');
             // 미션이 없으면 스냅샷 의미 없음, 체크 완료로 간주
             setSnapshotChecked(true);
             isSnapshotCheckRunning.current = false;
             return;
          }

          // 1. 오늘 날짜의 스냅샷 확인
          console.log(`[Snapshot Check] Checking for snapshot on ${formattedToday} for user ${user.id}`);
          const { data: existingSnapshot, error: checkError } = await supabase
            .from('daily_mission_snapshots')
            .select('id', { count: 'exact' }) // count만 가져와도 됨
            .eq('user_id', user.id)
            .eq('date', formattedToday)
            .limit(1); // 하나만 찾으면 됨

          if (checkError) throw checkError;

          // 2. 스냅샷 없으면 생성
          if (!existingSnapshot || existingSnapshot.length === 0) {
            console.log(`[Snapshot Create] No existing snapshot found. Creating for ${formattedToday}`);
            const { error: insertError } = await supabase
              .from('daily_mission_snapshots')
              .insert({
                user_id: user.id,
                date: formattedToday,
                missions_snapshot: missions,
                total_missions_count: missions.length,
                completed_missions_count: 0,
              });

            if (insertError) throw insertError;
            console.log(`[Snapshot Create] Snapshot created successfully for ${formattedToday}`);
          } else {
            console.log(`[Snapshot Check] Snapshot already exists for ${formattedToday}`);
          }
          setSnapshotChecked(true); // 확인/생성 완료
        } catch (err) {
          console.error("[Snapshot Check/Create Error]:", err);
          setSnapshotChecked(true); // 에러 발생 시에도 완료로 처리 (무한 루프 방지)
        } finally {
           isSnapshotCheckRunning.current = false; // 실행 종료 플래그
        }
      };

      checkAndCreateSnapshot();
    } else {
        // 조건을 만족하지 못한 경우 로그 (디버깅용)
        // console.log('[Snapshot Effect] Conditions not met or already checked/running.', { userId: !!user, missionsLoaded: !missionsLoading, snapshotChecked, isRunning: isSnapshotCheckRunning.current });
    }
    // 의존성 배열: user, missionsLoading만 사용. missions 배열 자체는 제외하여 불필요한 재실행 방지
  }, [user, missionsLoading, snapshotChecked, formattedToday, missions]); // missions를 의존성에 다시 추가 (snapshot 생성 시 필요)
  // --- 스냅샷 로직 끝 --- //

  // Load celebration sound
  useEffect(() => {
    // You should host your own celebration sound or find a royalty-free one
    // Example path, replace with your actual sound file path
    const celebrationSound = new Audio('/sounds/celebrate.mp3');
    celebrationSound.preload = 'auto';
    setAudio(celebrationSound);

    // Clean up audio element on unmount
    return () => {
        if(celebrationSound) {
            celebrationSound.pause();
            celebrationSound.src = ''; // Release resource
        }
    };
  }, []);

  // Combine missions and logs data
  const missionsWithStatus = useMemo((): MissionWithLogs[] => {
    if (missionsLoading || logsLoading) return [];
    return missions.map(mission => ({
      ...mission,
      is_completed_today: logs.some(log => log.mission_id === mission.id),
      logs: logs.filter(log => log.mission_id === mission.id)
    }));
  }, [missions, logs, missionsLoading, logsLoading]);

  const handleToggleComplete = async (mission: MissionWithLogs) => {
    if (mission.is_completed_today) {
      // If already completed, delete the log (uncomplete)
      await deleteLog(mission.id);
    } else {
      // If not completed, add the log (complete)
      const addedLog = await addLog(mission.id);
      if (addedLog) {
        // Play sound and show confetti on completion
        if (audio) {
           audio.currentTime = 0; // Rewind to start
           audio.play().catch(e => console.error("Audio play failed:", e));
        }
        setShowConfetti(true);
      }
    }
    // The hooks will refetch/update the state automatically
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  // 로딩 상태 결정
  const isLoading = useMemo(() => {
      // 모든 데이터 로딩이 완료되고, 스냅샷 체크도 완료되었을 때만 로딩 해제
      const dataLoading = missionsLoading || logsLoading || weekStatusLoading;
      console.log('[Render Check] isLoading:', dataLoading || !snapshotChecked, { dataLoading, snapshotChecked });
      return dataLoading || !snapshotChecked;
  }, [missionsLoading, logsLoading, weekStatusLoading, snapshotChecked]);

  const error = missionsError || logsError || weekStatusError;

  // Simple weekday display (Korean)
  const getWeekdayString = (date: Date): string => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConfettiEffect run={showConfetti} recycle={false} onComplete={handleConfettiComplete} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-pink-700">고운이의 방울방울 하루 챌린지</h1>
        <div className="text-right">
            <p className="text-lg font-semibold text-pink-600">
                {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-md text-pink-500">{getWeekdayString(today)}요일</p>
        </div>
      </div>

      {isLoading && <p>데이터 로딩 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}

      {!isLoading && !error && (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {missionsWithStatus.length === 0 && (
              <p className="text-center text-gray-500 bg-white p-6 rounded-lg shadow">아직 설정된 미션이 없어요! "도전과제 설정"에서 오늘의 미션을 만들어 보세요.</p>
            )}
            {missionsWithStatus.map((mission, index) => {
              // 완료 시 적용할 색상 결정 (index 기반)
              const completedColor = pastelRainbowColors[index % pastelRainbowColors.length];
              const missionStyle = mission.is_completed_today
                ? `${completedColor.bg} border-l-4 ${completedColor.border}`
                : 'bg-white hover:bg-pink-50';
              const textStyle = mission.is_completed_today
                ? `${completedColor.text} line-through`
                : 'text-gray-800';

              return (
                <div
                  key={mission.id}
                  onClick={() => handleToggleComplete(mission)} // div 전체 클릭 핸들러
                  className={`flex items-center p-4 rounded-lg shadow transition-all duration-300 ease-in-out cursor-pointer ${missionStyle}`}
                >
                  <div className="flex-grow mr-4">
                    <p className={`text-lg font-medium ${textStyle}`}>
                      {mission.content}
                    </p>
                  </div>
                  {/* 버튼 제거 */}
                  {/*
                  <button
                    onClick={() => handleToggleComplete(mission)}
                    className={`p-2 rounded-full transition-colors ${mission.is_completed_today ? 'text-green-600 hover:bg-green-200' : 'text-gray-400 hover:bg-gray-200'}`}
                    aria-label={mission.is_completed_today ? '미션 완료 취소' : '미션 완료'}
                  >
                    {mission.is_completed_today ? <FaCheckCircle size={28} /> : <LuCircle size={28} />}
                  </button>
                  */}
                </div>
              );
            })}
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