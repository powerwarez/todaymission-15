import React, { useState } from "react";
import { useMissions } from "../hooks/useMissions";
import { Mission } from "../types";
import { LuCirclePlus, LuTrash2, LuSave, LuPencil } from "react-icons/lu";

const ChallengeSettingsPage: React.FC = () => {
  const { missions, loading, error, addMission, updateMission, deleteMission } =
    useMissions();
  const [newMissionContent, setNewMissionContent] = useState("");
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

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

  const handleDeleteMission = async (id: string) => {
    if (window.confirm("정말로 이 미션을 삭제하시겠습니까?")) {
      await deleteMission(id);
      // Handle error case if needed
    }
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
    <div className="container mx-auto px-4 py-8">
      <h1
        className="text-3xl font-bold mb-6"
        style={{ color: "var(--color-text-primary)" }}
      >
        오늘의 미션 설정
      </h1>

      {loading && <p>로딩 중...</p>}
      {error && <p style={{ color: "var(--color-text-error)" }}>{error}</p>}

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          오늘의 미션 목록 관리
        </h2>
        <p className="text-sm text-gray-500 mb-4">
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
              className="flex items-center justify-between p-3 rounded-md cursor-grab transition-colors"
              style={{
                backgroundColor: "var(--color-bg-hover)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-light)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
              }}
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
                  className="flex-grow p-1 border  rounded mr-2"
                  style={{
                    borderColor: "var(--color-border-default)",
                  }}
                />
              ) : (
                <span
                  className="flex-grow cursor-pointer"
                  onClick={() => setEditingMission({ ...mission })} // Enter editing mode on click
                >
                  {mission.content}
                </span>
              )}
              <div className="flex items-center space-x-2">
                {editingMission?.id === mission.id ? (
                  <button
                    onClick={() => handleUpdateMission(mission)}
                    style={{ color: "var(--color-success)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--color-success-dark)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--color-success)";
                    }}
                  >
                    <LuSave size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingMission({ ...mission })}
                    style={{ color: "var(--color-primary-medium)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--color-primary-dark)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        "var(--color-primary-medium)";
                    }}
                  >
                    <LuPencil size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteMission(mission.id)}
                  className="disabled:opacity-50"
                  style={{ color: "var(--color-text-error)" }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.color =
                        "var(--color-text-error-dark)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-error)";
                  }}
                  disabled={missions.length <= 3} // Cannot delete if 3 or fewer missions
                  title={
                    missions.length <= 3
                      ? "최소 3개의 미션이 필요합니다."
                      : "미션 삭제"
                  }
                >
                  <LuTrash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {missions.length < 10 && (
          <form
            onSubmit={handleAddMission}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={newMissionContent}
              onChange={(e) => setNewMissionContent(e.target.value)}
              placeholder="새 미션 내용 입력 (예: 이 닦기)"
              className="flex-grow p-2 rounded-md"
              style={{
                border: "1px solid var(--color-border-default)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-border-focus)";
                e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-border-default)";
                e.target.style.boxShadow = "none";
              }}
              maxLength={100} // Example max length
            />
            <button
              type="submit"
              className="text-white p-2 rounded-md flex items-center transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-primary-medium)",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-primary-dark)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-primary-medium)";
              }}
              disabled={!newMissionContent.trim() || loading}
            >
              <LuCirclePlus size={18} className="mr-1" />
              추가
            </button>
          </form>
        )}
        {missions.length >= 10 && (
          <p className="text-sm text-gray-500">
            미션은 최대 10개까지 추가할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChallengeSettingsPage;
