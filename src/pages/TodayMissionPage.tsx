import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; // Supabase 클라이언트 직접 사용
import { useAuth } from '../contexts/AuthContext'; // 사용자 정보 가져오기
import { useMissions } from '../hooks/useMissions';
import { useMissionLogs } from '../hooks/useMissionLogs';
import { useWeeklyCompletionStatus } from '../hooks/useWeeklyCompletionStatus'; // 주간 현황 훅 임포트
import WeeklyStatusDisplay from '../components/WeeklyStatusDisplay'; // 주간 현황 컴포넌트 임포트
import ConfettiEffect from '../components/ConfettiEffect';
import { Mission } from '../types'; // Mission 타입만 가져오기
import { toZonedTime, format } from 'date-fns-tz'; // date-fns-tz import
// import { FaCheckCircle } from "react-icons/fa"; // 버튼 제거로 불필요
// import { LuCircle } from 'react-icons/lu'; // 버튼 제거로 불필요

// 완료 시 적용할 파스텔 무지개 색상 배열 (변경 없음)
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
  const { user, timeZone } = useAuth(); // 사용자 정보 가져오기

  // 오늘 날짜를 KST 기준으로 설정
  const todayKSTObj = useMemo(() => toZonedTime(new Date(), timeZone), [timeZone]);
  const formattedTodayKST = useMemo(() => format(todayKSTObj, 'yyyy-MM-dd', { timeZone }), [todayKSTObj, timeZone]);

  const { missions, loading: missionsLoading, error: missionsError, fetchMissions } = useMissions();
  const { logs, loading: logsLoading, error: logsError, addLog, deleteLog } = useMissionLogs(formattedTodayKST);
  const { weekStatus, loading: weekStatusLoading, error: weekStatusError, refetch: refetchWeeklyStatus } = useWeeklyCompletionStatus(); // 주간 현황 데이터 로드

  const [showConfetti, setShowConfetti] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [snapshotChecked, setSnapshotChecked] = useState(false); // 스냅샷 확인/생성 완료 여부
  const isSnapshotCheckRunning = useRef(false); // 스냅샷 체크 중복 실행 방지 플래그
  
  // 사용자 정보 상태
  const [childName, setChildName] = useState<string>('고운이');
  
  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_info')
          .select('child_name')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.error('사용자 정보를 가져오는 중 오류가 발생했습니다:', error);
        } else if (data && data.child_name) {
          setChildName(data.child_name);
        }
      } catch (err) {
        console.error('사용자 정보 조회 중 오류가 발생했습니다:', err);
      }
    };
    
    fetchUserInfo();
  }, [user]);

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
             console.log('[Snapshot Check] No missions loaded yet or empty, skipping.');
             // 미션이 없으면 스냅샷 의미 없음, 체크 완료로 간주
             setSnapshotChecked(true);
             isSnapshotCheckRunning.current = false;
             return;
          }

          // 1. 오늘 날짜(KST)의 스냅샷 확인
          console.log(`[Snapshot Check] Checking for snapshot on ${formattedTodayKST} for user ${user.id}`);
          const { data: existingSnapshot, error: checkError } = await supabase
            .from('daily_mission_snapshots')
            .select('id', { count: 'exact' }) // count만 가져와도 됨
            .eq('user_id', user.id)
            // KST 기준 날짜 문자열로 비교
            .eq('date', formattedTodayKST)
            .limit(1); // 하나만 찾으면 됨

          if (checkError) throw checkError;

          // 2. 스냅샷 없으면 생성
          if (!existingSnapshot || existingSnapshot.length === 0) {
            console.log(`[Snapshot Create] No existing snapshot found. Creating for ${formattedTodayKST}`);
            const { error: insertError } = await supabase
              .from('daily_mission_snapshots')
              .insert({
                user_id: user.id,
                // KST 기준 날짜 문자열 사용
                date: formattedTodayKST,
                missions_snapshot: missions,
                total_missions_count: missions.length,
                completed_missions_count: 0,
              });

            if (insertError) throw insertError;
            console.log(`[Snapshot Create] Snapshot created successfully for ${formattedTodayKST}`);
          } else {
            console.log(`[Snapshot Check] Snapshot already exists for ${formattedTodayKST}`);
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
    }
    // 의존성 배열에 formattedTodayKST 추가
  }, [user, missionsLoading, snapshotChecked, formattedTodayKST, missions]);
  // --- 스냅샷 로직 끝 --- //

  // Load celebration sound (변경 없음)
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

  // 요일을 한국어로 변환
  const getWeekdayString = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 미션 상태 토글 처리 함수
  const handleToggleComplete = async (mission: Mission) => {
    if (!user) return;
    try {
      if (missionsLoading || logsLoading) return;
      
      const missionToUpdate = missionsWithStatus.find((m) => m.id === mission.id);
      if (!missionToUpdate) return;
      
      if (missionToUpdate.is_completed_today) {
        // 이미 완료된 미션이면 로그 삭제
        if (missionToUpdate.log_id) { // 로그 ID가 있는 경우에만 삭제 시도
          await deleteLog(missionToUpdate.log_id);
          // 주간 현황 갱신
          refetchWeeklyStatus();
        }
      } else {
        // 완료되지 않은 미션이면 로그 추가
        await addLog(mission.id);
        
        // 효과음 재생
        if (audio) {
          audio.currentTime = 0;
          audio.play().catch(e => console.error("Audio play error:", e));
        }
        
        // 폭죽 효과 표시
        setShowConfetti(true);
        // 주간 현황 갱신
        refetchWeeklyStatus();
      }
    } catch (error) {
      console.error('미션 상태 변경 중 오류 발생:', error);
      // 오류 발생 시 원래 상태로 되돌림
      await fetchMissions();
    }
  };

  // 폭죽 완료 후 처리
  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  // 로딩 상태 통합 체크
  const isLoading = missionsLoading || logsLoading || weekStatusLoading;
  
  // 에러 상태 통합 체크
  const error = missionsError || logsError || weekStatusError;
  
  // 미션 데이터와 로그 데이터 결합
  const missionsWithStatus = useMemo(() => {
    if (!missions || !logs) return [];
    
    return missions.map(mission => {
      // 오늘 완료된 로그 찾기
      const completedLog = logs.find(log => log.mission_id === mission.id);
      
      return {
        ...mission,
        is_completed_today: !!completedLog,
        log_id: completedLog?.id
      };
    });
  }, [missions, logs]);

  return (
    <div className="container mx-auto px-4 py-8">
      <ConfettiEffect run={showConfetti} recycle={false} onComplete={handleConfettiComplete} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-pink-700">
          {childName || "우리 아이의 방울방울 미션 챌린지"}
        </h1>
        <div className="text-right">
            <p className="text-lg font-semibold text-pink-600">
                {/* 표시 날짜도 KST 기준으로 명확하게 */}
                {format(todayKSTObj, 'yyyy년 M월 d일', { timeZone })}
            </p>
            {/* 요일 표시는 로컬 Date 객체의 getDay() 사용 가능 */}
            <p className="text-md text-pink-500">{getWeekdayString(todayKSTObj)}요일</p>
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
                  {/* 체크 표시 추가 */}
                  <div className="flex-shrink-0 w-6 h-6">
                    <div className={`w-6 h-6 rounded-full border-2 ${mission.is_completed_today ? 
                      `${completedColor.border} flex justify-center items-center` : 
                      'border-gray-300'}`}>
                      {mission.is_completed_today && (
                        <div className={`w-3 h-3 rounded-full ${completedColor.border.replace('border', 'bg')}`}></div>
                      )}
                    </div>
                  </div>
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