import React, { useState, useMemo, useEffect } from 'react';
import { useMissions } from '../hooks/useMissions';
import { useMissionLogs } from '../hooks/useMissionLogs';
import ConfettiEffect from '../components/ConfettiEffect';
import { MissionWithLogs } from '../types'; // Combined type
import { FaCheckCircle } from "react-icons/fa";
import { LuCircle } from 'react-icons/lu';

const TodayMissionPage: React.FC = () => {
  const today = useMemo(() => new Date(), []); // Get today's date once
  const { missions, loading: missionsLoading, error: missionsError } = useMissions();
  const { logs, loading: logsLoading, error: logsError, addLog, deleteLog } = useMissionLogs(today);

  const [showConfetti, setShowConfetti] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

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
    if (missionsLoading || logsLoading) return []; // Return empty while loading

    return missions.map(mission => ({
      ...mission,
      is_completed_today: logs.some(log => log.mission_id === mission.id),
      logs: logs.filter(log => log.mission_id === mission.id) // Attach relevant logs if needed elsewhere
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

  const isLoading = missionsLoading || logsLoading;
  const error = missionsError || logsError;

  // Simple weekday display (Korean)
  const getWeekdayString = (date: Date): string => {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConfettiEffect run={showConfetti} recycle={false} onComplete={handleConfettiComplete} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-pink-700">오늘의 미션</h1>
        <div className="text-right">
            <p className="text-lg font-semibold text-pink-600">
                {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-md text-pink-500">{getWeekdayString(today)}요일</p>
        </div>
      </div>

      {isLoading && <p>미션 로딩 중...</p>}
      {error && <p className="text-red-500">오류: {error}</p>}

      {!isLoading && !error && (
        <div className="space-y-4">
          {missionsWithStatus.length === 0 && (
            <p className="text-center text-gray-500 bg-white p-6 rounded-lg shadow">아직 설정된 미션이 없어요! "도전과제 설정"에서 오늘의 미션을 만들어 보세요.</p>
          )}
          {missionsWithStatus.map((mission) => (
            <div
              key={mission.id}
              className={`flex items-center p-4 rounded-lg shadow transition-all duration-300 ease-in-out ${
                mission.is_completed_today ? 'bg-green-100 border-l-4 border-green-500' : 'bg-white hover:bg-pink-50'
              }`}
            >
              <div className="flex-grow mr-4">
                <p className={`text-lg font-medium ${mission.is_completed_today ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                  {mission.content}
                </p>
              </div>
              <button
                onClick={() => handleToggleComplete(mission)}
                className={`p-2 rounded-full transition-colors ${mission.is_completed_today ? 'text-green-600 hover:bg-green-200' : 'text-gray-400 hover:bg-gray-200'}`}
                aria-label={mission.is_completed_today ? '미션 완료 취소' : '미션 완료'}
              >
                {mission.is_completed_today ? <FaCheckCircle size={28} /> : <LuCircle size={28} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayMissionPage; 