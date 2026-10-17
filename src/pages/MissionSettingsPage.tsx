import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMissions } from "../hooks/useMissions";
import MissionSettingItem from "../components/MissionSettingItem";
import {
  LuPlus,
  LuSettings,
  LuArrowUp,
  LuArrowDown,
  LuPalette,
  LuTarget,
  LuTrash2,
  LuAward,
} from "react-icons/lu";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import Spinner from "../components/ui/Spinner";
import WeeklyBadgeSetting from "../components/WeeklyBadgeSetting";
import AccountSettings from "../components/AccountSettings";
import PinAuthModal from "../components/PinAuthModal";
import ConfirmModal from "../components/ConfirmModal";
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
  const {
    missions,
    loading,
    error,
    addMission,
    deleteMission,
    updateMission,
    reorderMissions,
  } = useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");
  const [isReordering, setIsReordering] = useState(false);

  // PIN 인증 관련 상태
  const [showPinAuth, setShowPinAuth] = useState<boolean>(true);
  const [pinVerified, setPinVerified] = useState<boolean>(false);

  // 사용자 도전과제 상태
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [deletingChallengeId, setDeletingChallengeId] = useState<string | null>(null);
  const [challengeToDelete, setChallengeToDelete] = useState<{
    id: string;
    badgeId: string;
  } | null>(null);

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
      setChallengeToDelete(null);
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

    // 삭제 후에도 order가 중복되지 않도록 현재 최대값 + 1 사용
    const nextOrder =
      missions.length > 0 ? Math.max(...missions.map((m) => m.order)) + 1 : 0;

    await addMission({
      content: newMissionContent.trim(),
      order: nextOrder,
    });

    setNewMissionContent("");
  };

  // 미션 순서 이동 (direction: -1 위로, 1 아래로)
  // 두 항목의 order 값을 교환하지 않고, 이동 후 전체 순서를 0..n-1 로 다시 부여한다.
  const moveMission = async (mission: Mission, direction: -1 | 1) => {
    if (isReordering) return; // 연타로 인한 중복 요청 방지

    const index = missions.findIndex((m) => m.id === mission.id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= missions.length) {
      return;
    }

    const orderedIds = missions.map((m) => m.id);
    [orderedIds[index], orderedIds[targetIndex]] = [
      orderedIds[targetIndex],
      orderedIds[index],
    ];

    setIsReordering(true);
    const ok = await reorderMissions(orderedIds);
    setIsReordering(false);

    if (!ok) {
      toast.error("순서 변경에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleMoveUp = (mission: Mission) => moveMission(mission, -1);
  const handleMoveDown = (mission: Mission) => moveMission(mission, 1);

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Card>
          <p className="text-center font-semibold ui-text-sub">
            로그인이 필요한 페이지입니다.
          </p>
        </Card>
      </div>
    );
  }

  const globalChallenges = userChallenges.filter((c) => c.is_global);
  const myChallenges = userChallenges.filter((c) => !c.is_global);

  return (
    <>
      {showPinAuth && !pinVerified && (
        <PinAuthModal onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      )}

      <ConfirmModal
        isOpen={challengeToDelete !== null}
        message="이 도전과제를 삭제하시겠습니까?"
        loading={deletingChallengeId !== null}
        onConfirm={() =>
          challengeToDelete &&
          handleDeleteChallenge(challengeToDelete.id, challengeToDelete.badgeId)
        }
        onCancel={() => setChallengeToDelete(null)}
      />

      {(!showPinAuth || pinVerified) && (
        <div className="max-w-4xl mx-auto px-1 sm:px-2 py-2 space-y-10">
          <PageHeader
            title="설정"
            description="컬러 테마, 계정, 오늘의 미션과 배지를 관리해요."
            icon={<LuSettings size={24} />}
            className="!mb-0"
          />

          {/* 테마 설정 섹션 */}
          <section aria-labelledby="section-theme">
            <h2 id="section-theme" className="ui-section-title mb-4">
              <LuPalette /> 테마 설정
            </h2>
            <ThemeManager />
          </section>

          {/* 계정 설정 섹션 */}
          <section aria-labelledby="section-account">
            <h2 id="section-account" className="sr-only">
              계정 설정
            </h2>
            {user && <AccountSettings />}
          </section>

          {/* 일일 미션 설정 섹션 */}
          <section aria-labelledby="section-missions">
            <h2 id="section-missions" className="ui-section-title mb-4">
              <LuSettings /> 오늘의 미션 설정
            </h2>
            <Card>
              <p className="ui-text-sub font-medium mb-6">
                매일 수행할 오늘의 미션을 설정하세요. 수정, 삭제, 순서 변경이
                가능합니다.
              </p>

              {error && (
                <p role="alert" className="ui-error-text mb-4">
                  {error}
                </p>
              )}

              {loading ? (
                <Spinner />
              ) : (
                <>
                  <ul className="space-y-3 mb-6">
                    {missions.map((mission, index) => (
                      <li key={mission.id} className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="soft"
                            size="sm"
                            iconOnly
                            onClick={() => handleMoveUp(mission)}
                            disabled={index === 0 || isReordering}
                            title="위로 이동"
                            aria-label="위로 이동"
                          >
                            <LuArrowUp size={18} />
                          </Button>
                          <Button
                            variant="soft"
                            size="sm"
                            iconOnly
                            onClick={() => handleMoveDown(mission)}
                            disabled={
                              index === missions.length - 1 || isReordering
                            }
                            title="아래로 이동"
                            aria-label="아래로 이동"
                          >
                            <LuArrowDown size={18} />
                          </Button>
                        </div>
                        <MissionSettingItem
                          mission={mission}
                          onUpdate={updateMission}
                          onDelete={deleteMission}
                        />
                      </li>
                    ))}
                  </ul>

                  <form onSubmit={handleAddMission} className="flex gap-2">
                    <input
                      type="text"
                      value={newMissionContent}
                      onChange={(e) => setNewMissionContent(e.target.value)}
                      placeholder="새 미션을 입력하세요"
                      aria-label="새 미션 이름"
                      className="flex-1 min-w-0"
                    />
                    <Button type="submit" variant="primary">
                      <LuPlus size={20} />
                      추가
                    </Button>
                  </form>
                </>
              )}
            </Card>
          </section>

          {/* 주간 배지 설정 섹션 */}
          <section aria-labelledby="section-weekly">
            <h2 id="section-weekly" className="ui-section-title mb-4">
              <LuAward /> 주간 배지 설정
            </h2>
            {user && <WeeklyBadgeSetting userId={user.id} />}
          </section>

          {/* 도전과제 설정 섹션 */}
          <section aria-labelledby="section-challenges">
            <h2 id="section-challenges" className="ui-section-title mb-4">
              <LuTarget /> 도전과제 설정
            </h2>
            <Card>
              <p className="ui-text-sub font-medium mb-6">
                나만의 도전과제를 만들어보세요! 미션을 완료하면 설정한 조건에 따라
                배지를 획득할 수 있습니다.
              </p>

              {/* 도전과제 목록 */}
              {challengesLoading ? (
                <Spinner />
              ) : (
                <>
                  {/* 공용 도전과제 */}
                  {globalChallenges.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="flex items-center gap-2 text-sm ui-text-sub">
                        <Chip>공용</Chip>
                        기본 도전과제
                      </h3>
                      <ul className="space-y-3">
                        {globalChallenges.map((challenge) => (
                          <ChallengeRow key={challenge.id} challenge={challenge} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 내 도전과제 */}
                  {myChallenges.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="text-sm ui-text-sub">내가 만든 도전과제</h3>
                      <ul className="space-y-3">
                        {myChallenges.map((challenge) => (
                          <ChallengeRow
                            key={challenge.id}
                            challenge={challenge}
                            deleting={deletingChallengeId === challenge.id}
                            onDelete={() =>
                              setChallengeToDelete({
                                id: challenge.id,
                                badgeId: challenge.badge_id,
                              })
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 도전과제가 하나도 없을 때 */}
                  {userChallenges.length === 0 && (
                    <p className="text-center py-8 font-semibold ui-text-sub">
                      등록된 도전과제가 없습니다.
                    </p>
                  )}
                </>
              )}

              {/* 도전과제 추가 컴포넌트 */}
              <ChallengeCreator onChallengeCreated={loadUserChallenges} />
            </Card>
          </section>
        </div>
      )}
    </>
  );
};

// 도전과제 한 줄 (onDelete 가 없으면 삭제 버튼을 숨긴다: 공용 도전과제)
interface ChallengeRowProps {
  challenge: UserChallenge;
  deleting?: boolean;
  onDelete?: () => void;
}

const ChallengeRow: React.FC<ChallengeRowProps> = ({
  challenge,
  deleting = false,
  onDelete,
}) => {
  const goalLabel = (() => {
    const n = challenge.required_count;
    switch (challenge.condition_type) {
      case "DAILY_COMPLETIONS":
        return `영웅 ${n}회`;
      case "DAILY_COMPLETIONS_REPEATABLE":
        return `영웅 ${n}회 (반복)`;
      case "MISSION_STREAK":
        return `연속 ${n}일`;
      case "TOTAL_COMPLETIONS":
        return `미션 ${n}개`;
      default:
        return `달성 ${n}회`;
    }
  })();

  return (
    <li className="ui-card-soft flex items-center gap-4">
      {/* 배지 이미지 */}
      <div className="flex-shrink-0">
        {challenge.badge?.image_path ? (
          <img
            src={challenge.badge.image_path}
            alt={challenge.name}
            className="w-14 h-14 object-cover rounded-full"
            style={{ border: "var(--ui-bw-thin) solid var(--ui-ink)" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder_badge.png";
            }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--ui-accent-soft)",
              border: "var(--ui-bw-thin) solid var(--ui-ink)",
            }}
          >
            <LuTarget size={24} />
          </div>
        )}
      </div>

      {/* 도전과제 정보 */}
      <div className="flex-1 min-w-0">
        <h4 className="text-base truncate">{challenge.name}</h4>
        <p className="text-sm ui-text-sub truncate">{challenge.description}</p>
        <div className="mt-1">
          <Chip>{goalLabel}</Chip>
        </div>
      </div>

      {/* 삭제 버튼 (내 도전과제만) */}
      {onDelete && (
        <Button
          variant="ghost"
          iconOnly
          onClick={onDelete}
          disabled={deleting}
          loading={deleting}
          aria-label="도전과제 삭제"
          style={{ color: "var(--color-error-dark)" }}
        >
          {!deleting && <LuTrash2 size={20} />}
        </Button>
      )}
    </li>
  );
};

export default MissionSettingsPage;
