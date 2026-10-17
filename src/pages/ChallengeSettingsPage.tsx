import React, { useState } from "react";
import { useMissions } from "../hooks/useMissions";
import { Mission } from "../types";
import { LuCirclePlus, LuTrash2, LuSave, LuPencil } from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const ChallengeSettingsPage: React.FC = () => {
  const { missions, loading, error, addMission, updateMission, deleteMission } =
    useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionContent.trim()) return;
    // Calculate next order number
    const nextOrder =
      missions.length > 0 ? Math.max(...missions.map((m) => m.order)) + 1 : 1;
    const added = await addMission({
      content: newMissionContent.trim(),
      order: nextOrder,
    });
    if (added) {
      setNewMissionContent(""); // Clear input after successful add
    }
    // Handle error case if needed (e.g., show notification)
  };

  const handleUpdateMission = async (mission: Mission) => {
    if (!editingMission || !editingMission.content.trim()) return;
    await updateMission(mission.id, {
      content: editingMission.content,
      order: editingMission.order,
    });
    setEditingMission(null); // Exit editing mode
    // Handle error case if needed
  };

  const handleConfirmDelete = async () => {
    if (!missionToDelete || isDeleting) return;
    setIsDeleting(true);
    const ok = await deleteMission(missionToDelete);
    setIsDeleting(false);
    if (ok) {
      toast.success("미션이 삭제되었습니다.");
    } else {
      toast.error("미션 삭제에 실패했습니다. 다시 시도해주세요.");
    }
    setMissionToDelete(null);
  };

  // Basic drag-and-drop reordering logic (can be enhanced with libraries)
  const handleDragStart = (
    e: React.DragEvent<HTMLLIElement>,
    mission: Mission
  ) => {
    e.dataTransfer.setData("missionId", mission.id);
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLLIElement>,
    targetMission: Mission
  ) => {
    e.preventDefault();
    const draggedMissionId = e.dataTransfer.getData("missionId");
    if (draggedMissionId === targetMission.id) return;

    const draggedIndex = missions.findIndex((m) => m.id === draggedMissionId);
    const targetIndex = missions.findIndex((m) => m.id === targetMission.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create a new ordered list
    const reorderedMissions = [...missions];
    const [draggedItem] = reorderedMissions.splice(draggedIndex, 1);
    reorderedMissions.splice(targetIndex, 0, draggedItem);

    // Update order property and call updateMission for each changed item
    const updatePromises = reorderedMissions.map((mission, index) => {
      const newOrder = index + 1;
      if (mission.order !== newOrder) {
        return updateMission(mission.id, { order: newOrder });
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(updatePromises);
      // State will be updated via the updateMission calls triggering a re-fetch or local update
    } catch (updateError) {
      console.error("Error reordering missions:", updateError);
      // Optionally refetch missions to revert to previous state on error
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  return (
    <div className="px-1 sm:px-2 py-2">
      <ConfirmModal
        isOpen={missionToDelete !== null}
        message="정말로 이 미션을 삭제하시겠습니까?"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setMissionToDelete(null)}
      />
      <PageHeader title="오늘의 미션 설정" />

      {loading && <Spinner label="로딩 중..." />}
      {error && (
        <p role="alert" className="ui-error-text mb-4">
          {error}
        </p>
      )}

      <Card className="mb-8">
        <h2 className="ui-section-title mb-2">오늘의 미션 목록 관리</h2>
        <p className="text-sm ui-text-sub font-medium mb-4">
          미션을 드래그하여 순서를 변경할 수 있습니다. 최대 10개, 최소 3개까지
          설정 가능합니다.
        </p>

        <ul className="space-y-3 mb-6">
          {missions.map((mission) => (
            <li
              key={mission.id}
              draggable
              onDragStart={(e) => handleDragStart(e, mission)}
              onDrop={(e) => handleDrop(e, mission)}
              onDragOver={handleDragOver}
              className="ui-card-soft flex items-center justify-between gap-2 cursor-grab"
              style={{ padding: "0.5rem 0.5rem 0.5rem 1rem" }}
            >
              {editingMission?.id === mission.id ? (
                <input
                  type="text"
                  value={editingMission.content}
                  onChange={(e) =>
                    setEditingMission({
                      ...editingMission,
                      content: e.target.value,
                    })
                  }
                  onBlur={() => handleUpdateMission(mission)} // Save on blur
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleUpdateMission(mission)
                  } // Save on Enter
                  autoFocus
                  aria-label="미션 이름"
                  className="flex-1 min-w-0"
                />
              ) : (
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left font-bold cursor-pointer break-words"
                  onClick={() => setEditingMission({ ...mission })} // Enter editing mode on click
                >
                  {mission.content}
                </button>
              )}
              <div className="flex items-center gap-1">
                {editingMission?.id === mission.id ? (
                  <Button
                    variant="primary"
                    iconOnly
                    onClick={() => handleUpdateMission(mission)}
                    aria-label="저장"
                  >
                    <LuSave size={20} />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    iconOnly
                    onClick={() => setEditingMission({ ...mission })}
                    aria-label="미션 수정"
                  >
                    <LuPencil size={20} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  iconOnly
                  onClick={() => setMissionToDelete(mission.id)}
                  style={{ color: "var(--color-error-dark)" }}
                  disabled={missions.length <= 3} // Cannot delete if 3 or fewer missions
                  title={
                    missions.length <= 3
                      ? "최소 3개의 미션이 필요합니다."
                      : "미션 삭제"
                  }
                  aria-label="미션 삭제"
                >
                  <LuTrash2 size={20} />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {missions.length < 10 && (
          <form onSubmit={handleAddMission} className="flex items-center gap-2">
            <input
              type="text"
              value={newMissionContent}
              onChange={(e) => setNewMissionContent(e.target.value)}
              placeholder="새 미션 내용 입력 (예: 이 닦기)"
              aria-label="새 미션 이름"
              className="flex-1 min-w-0"
              maxLength={100} // Example max length
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newMissionContent.trim() || loading}
            >
              <LuCirclePlus size={20} />
              추가
            </Button>
          </form>
        )}
        {missions.length >= 10 && (
          <p className="text-sm ui-text-sub font-medium">
            미션은 최대 10개까지 추가할 수 있습니다.
          </p>
        )}
      </Card>
    </div>
  );
};

export default ChallengeSettingsPage;
