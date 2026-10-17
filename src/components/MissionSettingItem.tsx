import React, { useState } from "react";
import { Mission } from "../types";
import { LuPencil, LuTrash, LuCheck, LuX } from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import Button from "./ui/Button";

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
    <div
      className="ui-card-soft flex-1 min-w-0 flex items-center gap-2"
      style={{ padding: "0.5rem 0.5rem 0.5rem 1rem", backgroundColor: "var(--ui-surface)" }}
    >
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
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="flex-1 min-w-0"
            maxLength={100}
            aria-label="미션 이름"
            autoFocus
          />
          <Button
            variant="primary"
            iconOnly
            onClick={handleSave}
            aria-label="저장"
            title="저장"
          >
            <LuCheck size={20} />
          </Button>
          <Button
            iconOnly
            onClick={handleCancel}
            aria-label="취소"
            title="취소"
          >
            <LuX size={20} />
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="truncate font-bold text-lg">{mission.content}</p>
          </div>
          <Button
            variant="ghost"
            iconOnly
            onClick={handleEdit}
            aria-label="미션 수정"
            title="수정"
          >
            <LuPencil size={20} />
          </Button>
          <Button
            variant="ghost"
            iconOnly
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="미션 삭제"
            title="삭제"
            style={{ color: "var(--color-error-dark)" }}
          >
            <LuTrash size={20} />
          </Button>
        </>
      )}
    </div>
  );
};

export default MissionSettingItem;
