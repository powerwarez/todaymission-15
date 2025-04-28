import React, { useImperativeHandle, forwardRef } from "react";
import confetti, { Options as ConfettiOptionsType } from "canvas-confetti";

// ConfettiOptions 타입을 내보내기
export type ConfettiOptions = ConfettiOptionsType;

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

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ autoPlay = false, options = {}, className, style }, ref) => {
    // 컨페티 효과 트리거 함수
    const triggerConfetti = (customOptions?: ConfettiOptions) => {
      try {
        // 효과음 재생 코드 제거

        // 기본 옵션과 사용자 지정 옵션 병합
        const defaultOptions = {
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        };

        const finalOptions = {
          ...defaultOptions,
          ...options,
          ...customOptions,
        };

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
