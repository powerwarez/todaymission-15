import React, { useEffect } from "react";
import { LuX } from "react-icons/lu";
import { cn } from "./cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 바깥 클릭/ESC 로 닫기 허용 여부 (기본 true) */
  dismissible?: boolean;
  /** 우측 상단 닫기 버튼 표시 (기본 true) */
  showClose?: boolean;
  /** Tailwind max-width 클래스 (기본 max-w-md) */
  maxWidthClass?: string;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  dismissible = true,
  showClose = true,
  maxWidthClass = "max-w-md",
  ariaLabel,
  className,
  children,
}) => {
  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, dismissible, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-backdrop"
      onClick={dismissible ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        className={cn("ui-modal", maxWidthClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && dismissible && (
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-ghost ui-btn-icon ui-btn-sm absolute top-3 right-3"
            aria-label="닫기"
          >
            <LuX size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
