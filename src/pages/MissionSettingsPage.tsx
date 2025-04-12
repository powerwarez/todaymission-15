import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMissions } from "../hooks/useMissions";
import MissionSettingItem from "../components/MissionSettingItem";
import { LuPlus, LuSettings, LuArrowUp, LuArrowDown, LuUser } from "react-icons/lu";
import WeeklyBadgeSetting from "../components/WeeklyBadgeSetting";
import AccountSettings from "../components/AccountSettings";
import PinAuthModal from "../components/PinAuthModal";
import { useNavigate } from "react-router-dom";
import { Mission } from "../types";

const MissionSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { missions, loading, error, addMission, deleteMission, updateMission } =
    useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");
  
  // PIN 인증 관련 상태
  const [showPinAuth, setShowPinAuth] = useState<boolean>(true);
  const [pinVerified, setPinVerified] = useState<boolean>(false);

  // 페이지 로드 시 PIN 인증 상태 확인
  useEffect(() => {
    const checkPinAuth = () => {
      const pinAuthData = localStorage.getItem('pinSettingsAuth');
      
      if (pinAuthData) {
        try {
          const { verified, expiry } = JSON.parse(pinAuthData);
          
          // 유효 시간 확인
          if (verified && expiry && new Date().getTime() < expiry) {
            setPinVerified(true);
            setShowPinAuth(false);
            return;
          }
        } catch (err) {
          console.error('PIN 인증 데이터 파싱 오류:', err);
        }
      }
      
      // 인증 정보가 없거나 만료된 경우
      setPinVerified(false);
      setShowPinAuth(true);
    };
    
    if (user) {
      checkPinAuth();
    }
  }, [user]);
  
  // PIN 인증 성공 핸들러
  const handlePinSuccess = () => {
    setPinVerified(true);
    setShowPinAuth(false);
    
    // 로컬 스토리지에 인증 정보 저장 (1시간 유효)
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);
    localStorage.setItem('pinSettingsAuth', JSON.stringify({
      verified: true,
      expiry: expiryTime.getTime()
    }));
  };
  
  // PIN 인증 취소 핸들러
  const handlePinCancel = () => {
    // 이전 페이지로 이동
    navigate(-1);
  };

  const handleAddMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMissionContent.trim() === "") return;

    await addMission({
      content: newMissionContent.trim(),
      order: missions.length,
    });

    setNewMissionContent("");
  };

  // 미션 순서 위로 이동
  const handleMoveUp = async (mission: Mission) => {
    const index = missions.findIndex(m => m.id === mission.id);
    if (index <= 0) return; // 이미 첫 번째 항목이면 이동 불가
    
    const prevMission = missions[index - 1];
    
    // 순서 교환
    await updateMission(mission.id, { order: prevMission.order });
    await updateMission(prevMission.id, { order: mission.order });
  };

  // 미션 순서 아래로 이동
  const handleMoveDown = async (mission: Mission) => {
    const index = missions.findIndex(m => m.id === mission.id);
    if (index >= missions.length - 1) return; // 이미 마지막 항목이면 이동 불가
    
    const nextMission = missions[index + 1];
    
    // 순서 교환
    await updateMission(mission.id, { order: nextMission.order });
    await updateMission(nextMission.id, { order: mission.order });
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4">
        <p className="text-center text-gray-600">
          로그인이 필요한 페이지입니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {showPinAuth && !pinVerified && (
        <PinAuthModal
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
      
      {(!showPinAuth || pinVerified) && (
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6 text-pink-700 flex items-center">
            <LuSettings className="mr-2" /> 설정
          </h1>

          {/* 계정 설정 섹션 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-pink-700 flex items-center">
              <LuUser className="mr-2" /> 계정 설정
            </h2>
            {user && <AccountSettings />}
          </div>

          {/* 일일 미션 설정 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              오늘의 미션 설정
            </h2>
            <p className="text-gray-600 mb-6">
              매일 수행할 오늘의 미션을 설정하세요. 수정, 삭제, 순서 변경이
              가능합니다.
            </p>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {missions.map((mission, index) => (
                    <div key={mission.id} className="flex items-center gap-2">
                      <div className="flex flex-col justify-center">
                        <button
                          onClick={() => handleMoveUp(mission)}
                          disabled={index === 0}
                          className={`p-1 text-gray-500 ${
                            index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gray-700'
                          }`}
                          title="위로 이동"
                        >
                          <LuArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(mission)}
                          disabled={index === missions.length - 1}
                          className={`p-1 text-gray-500 ${
                            index === missions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-gray-700'
                          }`}
                          title="아래로 이동"
                        >
                          <LuArrowDown size={16} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <MissionSettingItem
                          mission={mission}
                          onDelete={deleteMission}
                          onUpdate={updateMission}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleAddMission}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newMissionContent}
                    onChange={(e) => setNewMissionContent(e.target.value)}
                    placeholder="새 미션 입력"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    maxLength={100}
                  />
                  <button
                    type="submit"
                    className="bg-pink-600 text-white p-2 rounded-lg hover:bg-pink-700 flex items-center"
                    disabled={!newMissionContent.trim()}
                  >
                    <LuPlus className="mr-1" /> 추가
                  </button>
                </form>
              </>
            )}
          </div>

          {/* 주간 배지 설정 섹션 */}
          <div className="mb-8">
          <h2 className="text-xl font-bold mb-6 text-pink-700 flex items-center">
            <LuSettings className="mr-2" /> 주간 미션 배지 설정
          </h2>
            {user && <WeeklyBadgeSetting userId={user.id} />}
          </div>
        </div>
      )}
    </>
  );
};

export default MissionSettingsPage;
