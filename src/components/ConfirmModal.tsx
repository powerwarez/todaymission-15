import React from "react";

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
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={loading ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-center mb-6"
          style={{ color: "var(--color-text-primary)" }}
        >
          {message}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-[44px] rounded-lg border border-gray-300 text-gray-700 touch-manipulation disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 min-h-[44px] rounded-lg text-white touch-manipulation disabled:opacity-50"
            style={{ backgroundColor: "var(--color-text-error)" }}
          >
            {loading ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
