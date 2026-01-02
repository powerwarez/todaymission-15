import React, { useState, useEffect, useCallback } from "react";
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
  LuTarget,
  LuTrash2,
} from "react-icons/lu";
import WeeklyBadgeSetting from "../components/WeeklyBadgeSetting";
import AccountSettings from "../components/AccountSettings";
import PinAuthModal from "../components/PinAuthModal";
import ThemeManager from "../components/ThemeManager";
import ChallengeCreator from "../components/ChallengeCreator";
import { useNavigate } from "react-router-dom";
import { Mission } from "../types";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

interface UserChallenge {
  id: string;
  name: string;
  description: string;
  badge_id: string;
  condition_type: string;
  required_count: number;
  created_at: string;
  is_global?: boolean;
  badge?: {
    id: string;
    name: string;
    image_path: string;
  };
}

const MissionSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { missions, loading, error, addMission, deleteMission, updateMission } =
    useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");

  // PIN 인증 관련 상태
  const [showPinAuth, setShowPinAuth] = useState<boolean>(true);
  const [pinVerified, setPinVerified] = useState<boolean>(false);

  // 사용자 도전과제 상태
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [deletingChallengeId, setDeletingChallengeId] = useState<string | null>(null);

  // 도전과제 로드 함수 (공용 + 사용자 정의)
  const loadUserChallenges = useCallback(async () => {
    if (!user) return;

    setChallengesLoading(true);
    try {
      // 공용 도전과제(is_global=true)와 사용자 정의 도전과제 모두 로드
      const { data, error: fetchError } = await supabase
        .from("challenges")
        .select(`
          id,
          name,
          description,
          badge_id,
          condition_type,
          required_count,
          created_at,
          is_global
        `)
        .or(`is_global.eq.true,user_id.eq.${user.id}`)
        .order("is_global", { ascending: false }) // 공용 도전과제 먼저
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // 배지 정보도 함께 가져오기
      if (data && data.length > 0) {
        const badgeIds = data.map((c) => c.badge_id);
        const { data: badgesData } = await supabase
          .from("badges")
          .select("id, name, image_path")
          .in("id", badgeIds);

        const challengesWithBadges = data.map((challenge) => ({
          ...challenge,
          badge: badgesData?.find((b) => b.id === challenge.badge_id),
        }));

        setUserChallenges(challengesWithBadges);
      } else {
        setUserChallenges([]);
      }
    } catch (err) {
      console.error("도전과제 로드 오류:", err);
    } finally {
      setChallengesLoading(false);
    }
  }, [user]);

  // 도전과제 삭제 함수
  const handleDeleteChallenge = async (challengeId: string, badgeId: string) => {
    if (!user || deletingChallengeId) return;

    const confirmed = window.confirm("이 도전과제를 삭제하시겠습니까?");
    if (!confirmed) return;

    setDeletingChallengeId(challengeId);
    try {
      // 1. 도전과제 삭제
      const { error: challengeError } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId)
        .eq("user_id", user.id);

      if (challengeError) throw challengeError;

      // 2. 관련 배지 삭제 (사용자가 만든 배지인 경우)
      const { error: badgeError } = await supabase
        .from("badges")
        .delete()
        .eq("id", badgeId)
        .eq("created_by", user.id);

      if (badgeError) {
        console.error("배지 삭제 오류 (무시됨):", badgeError);
      }

      // 3. 관련 이미지 삭제 시도 (실패해도 무시)
      try {
        const fileName = badgeId.split("/").pop();
        if (fileName) {
          await supabase.storage
            .from("badges")
            .remove([`user_badges/${user.id}/${fileName}`]);
        }
      } catch {
        // 이미지 삭제 실패는 무시
      }

      toast.success("도전과제가 삭제되었습니다.");
      loadUserChallenges();
    } catch (err) {
      console.error("도전과제 삭제 오류:", err);
      toast.error("도전과제 삭제에 실패했습니다.");
    } finally {
      setDeletingChallengeId(null);
    }
  };

  // 페이지 로드 시 PIN 인증 상태 확인
  useEffect(() => {
    // 페이지 로드될 때마다 항상 PIN 인증 요구
    setPinVerified(false);
    setShowPinAuth(true);
  }, [user]);

  // PIN 인증 후 도전과제 로드
  useEffect(() => {
    if (pinVerified && user) {
      loadUserChallenges();
    }
  }, [pinVerified, user, loadUserChallenges]);

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

          {/* 도전과제 설정 섹션 */}
          <div className="mt-8">
            <h1
              className="text-2xl font-bold mb-6 flex items-center"
              style={{ color: "var(--color-text-primary)" }}
            >
              <LuTarget className="mr-2" /> 도전과제 설정
            </h1>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p className="text-gray-600 mb-6">
                나만의 도전과제를 만들어보세요! 미션을 완료하면 설정한 조건에 따라 배지를 획득할 수 있습니다.
              </p>

              {/* 도전과제 목록 */}
              {challengesLoading ? (
                <div className="flex justify-center py-8">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: "var(--color-primary-medium)" }}
                  ></div>
                </div>
              ) : (
                <>
                  {/* 공용 도전과제 */}
                  {userChallenges.filter((c) => c.is_global).length > 0 && (
                    <div className="space-y-4 mb-6">
                      <h3
                        className="text-sm font-medium flex items-center gap-2"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: "var(--color-accent-light)",
                            color: "var(--color-accent-dark)",
                          }}
                        >
                          공용
                        </span>
                        기본 도전과제
                      </h3>
                      {userChallenges
                        .filter((c) => c.is_global)
                        .map((challenge) => (
                          <div
                            key={challenge.id}
                            className="flex items-center gap-4 p-4 rounded-lg border"
                            style={{
                              borderColor: "var(--color-border-light)",
                              backgroundColor: "var(--color-bg-hover)",
                            }}
                          >
                            {/* 배지 이미지 */}
                            <div className="flex-shrink-0">
                              {challenge.badge?.image_path ? (
                                <img
                                  src={challenge.badge.image_path}
                                  alt={challenge.name}
                                  className="w-12 h-12 object-cover rounded-full border-2"
                                  style={{ borderColor: "var(--color-accent-light)" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/placeholder_badge.png";
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: "var(--color-accent-light)",
                                  }}
                                >
                                  <LuTarget
                                    size={24}
                                    style={{ color: "var(--color-accent)" }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* 도전과제 정보 */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className="font-medium truncate"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {challenge.name}
                              </h4>
                              <p
                                className="text-sm truncate"
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                {challenge.description}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: "var(--color-accent-light)",
                                    color: "var(--color-accent-dark)",
                                  }}
                                >
                                  {challenge.condition_type === "DAILY_COMPLETIONS"
                                    ? "영웅"
                                    : "달성"}{" "}
                                  {challenge.required_count}회
                                </span>
                              </div>
                            </div>
                            {/* 공용 도전과제는 삭제 버튼 없음 */}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 내 도전과제 */}
                  {userChallenges.filter((c) => !c.is_global).length > 0 && (
                    <div className="space-y-4 mb-6">
                      <h3
                        className="text-sm font-medium"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        내가 만든 도전과제
                      </h3>
                      {userChallenges
                        .filter((c) => !c.is_global)
                        .map((challenge) => (
                          <div
                            key={challenge.id}
                            className="flex items-center gap-4 p-4 rounded-lg border"
                            style={{
                              borderColor: "var(--color-border-light)",
                              backgroundColor: "var(--color-bg-hover)",
                            }}
                          >
                            {/* 배지 이미지 */}
                            <div className="flex-shrink-0">
                              {challenge.badge?.image_path ? (
                                <img
                                  src={challenge.badge.image_path}
                                  alt={challenge.name}
                                  className="w-12 h-12 object-cover rounded-full border-2"
                                  style={{ borderColor: "var(--color-primary-light)" }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/placeholder_badge.png";
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center"
                                  style={{
                                    backgroundColor: "var(--color-primary-light)",
                                  }}
                                >
                                  <LuTarget
                                    size={24}
                                    style={{ color: "var(--color-primary-medium)" }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* 도전과제 정보 */}
                            <div className="flex-1 min-w-0">
                              <h4
                                className="font-medium truncate"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {challenge.name}
                              </h4>
                              <p
                                className="text-sm truncate"
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                {challenge.description}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: "var(--color-primary-light)",
                                    color: "var(--color-primary-dark)",
                                  }}
                                >
                                  {challenge.condition_type === "DAILY_COMPLETIONS"
                                    ? "영웅"
                                    : "달성"}{" "}
                                  {challenge.required_count}회
                                </span>
                              </div>
                            </div>

                            {/* 삭제 버튼 (내 도전과제만) */}
                            <button
                              onClick={() =>
                                handleDeleteChallenge(challenge.id, challenge.badge_id)
                              }
                              disabled={deletingChallengeId === challenge.id}
                              className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: "var(--color-text-error)" }}
                            >
                              {deletingChallengeId === challenge.id ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-red-500 inline-block"></span>
                              ) : (
                                <LuTrash2 size={20} />
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* 도전과제가 하나도 없을 때 */}
                  {userChallenges.length === 0 && (
                    <p
                      className="text-center py-8"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      등록된 도전과제가 없습니다.
                    </p>
                  )}
                </>
              )}

              {/* 도전과제 추가 컴포넌트 */}
              <ChallengeCreator onChallengeCreated={loadUserChallenges} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MissionSettingsPage;
