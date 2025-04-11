import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'; // CSSProperties 추가
import { Badge } from '../types'; // Badge 타입
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge; // 이제 null이 아님, 항상 배지 정보 포함
  onClose: () => void; // badgeId는 App.tsx에서 처리하므로 여기선 필요 없음
  // isLoading은 App.tsx 레벨에서 관리되므로 제거
  // isLoading: boolean;
  style?: CSSProperties; // 외부에서 스타일 주입 가능하도록
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ 
  badge, 
  onClose, 
  style // 외부 스타일 적용
}) => {
  // 내부 표시 상태 추가
  const [internalVisible, setInternalVisible] = useState(false);
  // 닫기 진행 중 상태 Ref (중복 호출 방지용)
  const isClosing = useRef(false);
  // 애니메이션 타이머 Ref
  const closeAnimTimerRef = useRef<number | undefined>(undefined);
  // 자동 닫기 타이머 Ref (자체 관리)
  const autoCloseTimerRef = useRef<number | undefined>(undefined);

  // 닫기 시작 함수 (타이머 또는 X 버튼에서 호출)
  const initiateClose = useCallback(() => {
    // 이미 닫는 중이거나 보이지 않으면 실행 안함
    if (isClosing.current) return;

    // internalVisible 상태를 다시 체크할 필요 없이 바로 닫기 시작
    console.log(`[Modal initiateClose] Starting closing process for badge: ${badge.id}`);
    isClosing.current = true; // 닫기 시작 플래그

    // 자동 닫기 타이머 클리어 (자체 관리)
    if (autoCloseTimerRef.current) {
      console.log(`[Modal initiateClose] Clearing self auto-close timer for badge: ${badge.id}`);
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = undefined;
    }
    // 애니메이션 타이머 클리어 (중복 방지)
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = undefined;
    }
    
    // 페이드 아웃 애니메이션 시작 (상태 변경)
    setInternalVisible(false); 

    // 애니메이션 시간 후 부모 onClose 호출
    closeAnimTimerRef.current = window.setTimeout(() => {
      console.log(`[Modal initiateClose] Animation finished, calling parent onClose for badge: ${badge.id}`);
      // 부모 컴포넌트에게 알림 (App.tsx에서 displayedBadges 업데이트)
      onClose(); 
      
      // 타이머 정리 (필수)
      closeAnimTimerRef.current = undefined;
      // isClosing 플래그는 여기서 리셋하면 안됨. 컴포넌트가 제거된 후에야 안전.
      // isClosing.current = false; 
    }, 300); // CSS transition duration

  }, [onClose, badge.id]);

  // 모달 표시 및 자동 닫기 타이머 설정 Effect
  useEffect(() => {
    console.log(`[Modal useEffect] Setting up for badge: ${badge.id}`);
    // 항상 마운트 시 표시 시작
    isClosing.current = false; // 닫기 플래그 초기화
    setInternalVisible(true); // 페이드 인 시작

    // 기존 타이머 클리어 (마운트/업데이트 시)
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current);
    
    // 새로운 자동 닫기 타이머 설정 (자체 관리)
    console.log(`[Modal useEffect] Starting auto-close timer (3s) for badge: ${badge.id}`);
    autoCloseTimerRef.current = window.setTimeout(() => {
      console.log(`[Modal setTimeout] Auto-closing modal for badge: ${badge.id}`);
      // initiateClose 호출 전 isClosing 상태 확인 불필요 (initiateClose 내부에서 확인)
      initiateClose(); 
    }, 3000);

    // 클린업 함수: 언마운트 시 모든 타이머 정리
    return () => {
      console.log(`[Modal useEffect Cleanup] Clearing timers for badge: ${badge.id}`);
      if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = undefined;
      }
      if (closeAnimTimerRef.current) {
          clearTimeout(closeAnimTimerRef.current);
          closeAnimTimerRef.current = undefined;
      }
    };
  }, [badge.id, initiateClose]);

  // 이미지 URL 생성 함수 (변경 없음)
  const getBadgeImageUrl = (imagePath: string | undefined): string => {
    if (!imagePath) return '/placeholder_badge.png';
    if (imagePath.startsWith('http')) {
      const cleanedUrl = imagePath.replace(/([^:]\/)\/+/g, "$1");
      return cleanedUrl;
    }
    console.warn("Image path is not a full URL, constructing one (fallback):", imagePath)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const bucketName = 'badges';
    const cleanRelativePath = imagePath.replace(/^\/+|\/+$/g, '');
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanRelativePath}`;
  };

  return (
    // internalVisible 상태에 따라 opacity 제어
    // 외부에서 주입된 스타일 적용
    <div
      style={style} // 적용
      className={`fixed bottom-5 right-5 z-[9999] w-full max-w-sm transition-opacity duration-300 ease-in-out ${
        internalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
       {/* 내용은 항상 배지가 있을 때만 렌더링 */}
       <div className="bg-white rounded-lg shadow-xl border border-pink-200 overflow-hidden">
         <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-12 w-12 object-contain mr-3"
                  src={getBadgeImageUrl(badge.image_path)}
                  alt={badge.name}
                  style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} // 육각형 클립 적용
                  onError={(e) => {
                      console.error("Image load error for:", getBadgeImageUrl(badge.image_path));
                      (e.target as HTMLImageElement).src = '/placeholder_badge.png';
                  }}
                />
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-semibold text-pink-700 flex items-center">
                  <LuBadgeCheck className="mr-1 text-green-500" />
                  {badge.badge_type === "weekly" ? "주간 미션 달성!" : "도전과제 달성!"}
                </p>
                <p className="mt-1 text-lg font-bold text-gray-800">{badge.name}</p>
                {badge.description && (
                  <p className="mt-1 text-sm text-gray-600">{badge.description}</p>
                )}
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={initiateClose} // X 버튼 클릭 시 닫기 시작
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <span className="sr-only">Close</span>
                  <LuX className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default BadgeNotificationModal; 