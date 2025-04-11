import React, { useImperativeHandle, forwardRef } from "react";
import confetti from "canvas-confetti";

// 컨페티 옵션 타입 정의
export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  startVelocity?: number;
  ticks?: number;
  gravity?: number;
  scalar?: number;
  shapes?: ("square" | "circle")[];
  zIndex?: number;
  drift?: number;
  decay?: number;
}

// 컨페티 ref 타입 정의
export interface ConfettiRef {
  trigger: (options?: ConfettiOptions) => void;
}

// 컨페티 컴포넌트 props 타입
interface ConfettiProps {
  autoPlay?: boolean;
  options?: ConfettiOptions;
  className?: string;
  style?: React.CSSProperties;
}

// 소리 파일 경로
const SOUND_PATH = "/sound/high_rune.flac";

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ autoPlay = false, options = {}, className, style }, ref) => {
    // 컨페티 효과 트리거 함수
    const triggerConfetti = (customOptions?: ConfettiOptions) => {
      try {
        // 효과음 재생 시도
        try {
          const audio = new Audio(SOUND_PATH);
          audio.volume = 0.5; // 볼륨 조절
          
          // 사용자 상호작용 없이도 재생 시도
          audio.play().catch(err => {
            console.warn("효과음 재생 실패 (사용자 상호작용 필요):", err);
          });
        } catch (audioErr) {
          console.warn("효과음 생성 실패:", audioErr);
        }
        
        // 기본 옵션과 사용자 지정 옵션 병합
        const defaultOptions = {
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        };
        
        const finalOptions = { ...defaultOptions, ...options, ...customOptions };
        
        // 컨페티 효과 시작
        confetti(finalOptions);
      } catch (err) {
        console.error("컨페티 효과 실행 중 오류:", err);
      }
    };

    // ref를 통해 외부에서 컨페티 효과 트리거 함수에 접근 가능하도록 설정
    useImperativeHandle(
      ref,
      () => ({
        trigger: triggerConfetti,
      }),
      [options]
    );

    // 자동 재생 옵션이 활성화된 경우 렌더링 시 자동으로 컨페티 효과 트리거
    React.useEffect(() => {
      if (autoPlay) {
        triggerConfetti();
      }
    }, [autoPlay]);

    // 컴포넌트 자체는 보이지 않게 처리
    return (
      <div
        className={className}
        style={{
          position: "absolute",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          ...style,
        }}
      />
    );
  }
);
