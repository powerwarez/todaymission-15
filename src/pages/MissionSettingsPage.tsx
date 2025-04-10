import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMissions } from "../hooks/useMissions";
import MissionSettingItem from "../components/MissionSettingItem";
import { LuPlus, LuSettings } from "react-icons/lu";
import WeeklyBadgeSetting from "../components/WeeklyBadgeSetting";

const MissionSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { missions, loading, error, addMission, deleteMission, updateMission } =
    useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");

  const handleAddMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMissionContent.trim() === "") return;

    await addMission({
      content: newMissionContent.trim(),
      order: missions.length,
    });

    setNewMissionContent("");
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-pink-700 flex items-center">
        <LuSettings className="mr-2" /> 미션 설정
      </h1>

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
              {missions.map((mission) => (
                <MissionSettingItem
                  key={mission.id}
                  mission={mission}
                  onDelete={deleteMission}
                  onUpdate={updateMission}
                />
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
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          주간 미션 배지 설정
        </h2>
        {user && <WeeklyBadgeSetting userId={user.id} />}
      </div>
    </div>
  );
};

export default MissionSettingsPage;
