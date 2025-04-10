import React, { forwardRef, useImperativeHandle, useRef } from "react";
import ReactConfetti from "react-confetti";

// Confetti에 사용할 옵션 타입 정의
export interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  ticks?: number;
  origin?: {
    x?: number;
    y?: number;
  };
  colors?: string[];
  shapes?: ("square" | "circle")[];
  scalar?: number;
  zIndex?: number;
  drift?: number;
  random?: () => number;
}

// Confetti에 외부에서 접근할 메서드 정의
export interface ConfettiRef {
  trigger: (options?: ConfettiOptions) => void;
}

// Confetti 컴포넌트 props 타입 정의
interface ConfettiProps {
  width?: number;
  height?: number;
}

// Confetti 컴포넌트 구현
export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ width, height }, ref) => {
    const [confetti, setConfetti] = React.useState({
      active: false,
      config: {} as ConfettiOptions,
    });

    useImperativeHandle(ref, () => ({
      trigger: (options: ConfettiOptions = {}) => {
        setConfetti({
          active: true,
          config: options,
        });

        // 지속 시간 설정 (옵션에 지정된 ticks 또는 기본값 사용)
        setTimeout(() => {
          setConfetti((prev) => ({ ...prev, active: false }));
        }, options.ticks || 200);
      },
    }));

    if (!confetti.active) return null;

    return (
      <ReactConfetti
        width={width || window.innerWidth}
        height={height || window.innerHeight}
        numberOfPieces={confetti.config.particleCount || 200}
        recycle={false}
      />
    );
  }
);

Confetti.displayName = "Confetti";

// 편의를 위한 훅
export const useConfetti = () => {
  const confettiRef = useRef<ConfettiRef>(null);

  const confetti = (options?: ConfettiOptions) => {
    confettiRef.current?.trigger(options);
  };

  return { confetti, confettiRef };
};
