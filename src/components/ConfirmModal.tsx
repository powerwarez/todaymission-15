import React from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// window.confirm 은 태블릿/PWA/인앱 브라우저에서 차단될 수 있어 앱 내부 모달로 대체
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  confirmText = "삭제",
  cancelText = "취소",
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    dismissible={!loading}
    showClose={false}
    maxWidthClass="max-w-sm"
    ariaLabel={message}
  >
    <p className="text-center text-lg font-bold mb-6">{message}</p>
    <div className="flex gap-3">
      <Button
        variant="secondary"
        className="flex-1"
        onClick={onCancel}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant="danger"
        className="flex-1"
        onClick={onConfirm}
        loading={loading}
      >
        {confirmText}
      </Button>
    </div>
  </Modal>
);

export default ConfirmModal;
