import React, { useState } from "react";
import { Mission } from "../types";
import { LuPencil, LuTrash, LuCheck, LuX } from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

interface MissionSettingItemProps {
  mission: Mission;
  onDelete: (id: string) => Promise<boolean>;
  onUpdate: (
    id: string,
    updates: { content?: string; order?: number }
  ) => Promise<void>;
}

const MissionSettingItem: React.FC<MissionSettingItemProps> = ({
  mission,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(mission.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(mission.content);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(mission.content);
  };

  const handleSave = async () => {
    if (editedContent.trim() === "") return;
    await onUpdate(mission.id, { content: editedContent.trim() });
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const ok = await onDelete(mission.id);
    setIsDeleting(false);
    if (ok) {
      toast.success("미션이 삭제되었습니다.");
    } else {
      toast.error("미션 삭제에 실패했습니다. 다시 시도해주세요.");
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex-1 flex items-center gap-2 p-3 border border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition">
      <ConfirmModal
        isOpen={showDeleteConfirm}
        message="이 미션을 삭제하시겠습니까?"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      {isEditing ? (
        <>
          <input
            type="text"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="flex-1 p-2 border rounded"
            style={{
              borderColor: "var(--color-border-default)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-border-focus)";
              e.target.style.boxShadow = `0 0 0 2px var(--color-border-focus)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--color-border-default)";
              e.target.style.boxShadow = "none";
            }}
            maxLength={100}
            autoFocus
          />
          <button
            onClick={handleSave}
            className="p-2 text-white rounded"
            style={{
              backgroundColor: "var(--color-success)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-success-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-success)";
            }}
            title="저장"
          >
            <LuCheck />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-white rounded"
            style={{
              backgroundColor: "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-text-muted)";
            }}
            title="취소"
          >
            <LuX />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">
            <p className="truncate">{mission.content}</p>
          </div>
          <button
            onClick={handleEdit}
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            style={{ color: "var(--color-primary-medium)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-primary-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-primary-medium)";
            }}
            title="수정"
          >
            <LuPencil />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            style={{ color: "var(--color-text-error)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-error-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-error)";
            }}
            title="삭제"
          >
            <LuTrash />
          </button>
        </>
      )}
    </div>
  );
};

export default MissionSettingItem;
