import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMissions } from "../hooks/useMissions";
import MissionSettingItem from "../components/MissionSettingItem";
import {
  LuPlus,
  LuSettings,
  LuArrowUp,
  LuArrowDown,
  LuUser,
  LuPalette,
} from "react-icons/lu";
import WeeklyBadgeSetting from "../components/WeeklyBadgeSetting";
import AccountSettings from "../components/AccountSettings";
import PinAuthModal from "../components/PinAuthModal";
import ThemeManager from "../components/ThemeManager";
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
    // 페이지 로드될 때마다 항상 PIN 인증 요구
    setPinVerified(false);
    setShowPinAuth(true);
  }, [user]);

  // PIN 인증 성공 핸들러
  const handlePinSuccess = () => {
    setPinVerified(true);
    setShowPinAuth(false);
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
    const index = missions.findIndex((m) => m.id === mission.id);
    if (index <= 0) return; // 이미 첫 번째 항목이면 이동 불가

    const prevMission = missions[index - 1];

    // 순서 교환
    await updateMission(mission.id, { order: prevMission.order });
    await updateMission(prevMission.id, { order: mission.order });
  };

  // 미션 순서 아래로 이동
  const handleMoveDown = async (mission: Mission) => {
    const index = missions.findIndex((m) => m.id === mission.id);
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
        <PinAuthModal onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      )}

      {(!showPinAuth || pinVerified) && (
        <div className="max-w-4xl mx-auto p-4">
          {/* 테마 설정 섹션 */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-6 flex items-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              <LuPalette className="mr-2" /> 테마 설정
            </h1>
            <ThemeManager />
          </div>

          {/* 계정 설정 섹션 */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-6 flex items-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              <LuUser className="mr-2" /> 계정 설정
            </h1>
            {user && <AccountSettings />}
          </div>

          {/* 일일 미션 설정 섹션 */}
          <h1
            className="text-2xl font-bold mb-8 flex items-center"
            style={{ color: "var(--color-text-primary)" }}
          >
            <LuSettings className="mr-2" /> 오늘의 미션 설정
          </h1>
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <p className="text-gray-600 mb-6">
              매일 수행할 오늘의 미션을 설정하세요. 수정, 삭제, 순서 변경이
              가능합니다.
            </p>

            {error && (
              <p style={{ color: "var(--color-text-error)" }} className="mb-4">
                {error}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: "var(--color-primary-medium)" }}
                ></div>
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
                            index === 0
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:text-gray-700"
                          }`}
                          title="위로 이동"
                        >
                          <LuArrowUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(mission)}
                          disabled={index === missions.length - 1}
                          className={`p-1 text-gray-500 ${
                            index === missions.length - 1
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:text-gray-700"
                          }`}
                          title="아래로 이동"
                        >
                          <LuArrowDown size={16} />
                        </button>
                      </div>
                      <MissionSettingItem
                        mission={mission}
                        onUpdate={updateMission}
                        onDelete={deleteMission}
                      />
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddMission} className="flex gap-2">
                  <input
                    type="text"
                    value={newMissionContent}
                    onChange={(e) => setNewMissionContent(e.target.value)}
                    placeholder="새 미션을 입력하세요"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="text-white p-2 rounded-lg flex items-center"
                    style={{
                      backgroundColor: "var(--color-primary-medium)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-primary-dark)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-primary-medium)";
                    }}
                  >
                    <LuPlus className="mr-1" />
                    추가
                  </button>
                </form>
              </>
            )}
          </div>

          {/* 주간 배지 설정 섹션 */}
          <h1
            className="text-xl font-bold mb-8 flex items-center"
            style={{ color: "var(--color-text-primary)" }}
          >
            <LuSettings className="mr-2" /> 주간 배지 설정
          </h1>
          {user && <WeeklyBadgeSetting userId={user.id} />}
        </div>
      )}
    </>
  );
};

export default MissionSettingsPage;
