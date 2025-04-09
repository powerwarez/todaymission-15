import React, { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'; // CSSProperties 추가
import { Badge } from '../types'; // Badge 타입
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge; // 이제 null이 아님, 항상 배지 정보 포함
  onClose: () => void; // badgeId는 App.tsx에서 처리하므로 여기선 필요 없음
  // isLoading은 App.tsx 레벨에서 관리되므로 제거
  // isLoading: boolean;
  closeTimeoutRefs: React.RefObject<Map<string, number>>; // 타임아웃 관리 Ref
  style?: CSSProperties; // 외부에서 스타일 주입 가능하도록
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ 
  badge, 
  onClose, 
  closeTimeoutRefs,
  style // 외부 스타일 적용
}) => {
  // 내부 표시 상태 추가
  const [internalVisible, setInternalVisible] = useState(false);
  // 닫기 진행 중 상태 Ref (중복 호출 방지용)
  const isClosing = useRef(false);
  // 애니메이션 타이머 Ref
  const closeAnimTimerRef = useRef<number | undefined>(undefined);

  // 닫기 시작 함수 (타이머 또는 X 버튼에서 호출)
  const initiateClose = useCallback(() => {
    // 이미 닫는 중이거나 보이지 않으면 실행 안함
    if (!internalVisible || isClosing.current) return;

    console.log(`[Modal initiateClose] Starting closing process for badge: ${badge.id}`);
    isClosing.current = true; // 닫기 시작 플래그
    setInternalVisible(false); // 페이드 아웃 애니메이션 시작

    // 해당 배지의 자동 닫기 타이머 클리어
    const autoCloseTimerId = closeTimeoutRefs.current?.get(badge.id);
    if (autoCloseTimerId) {
      clearTimeout(autoCloseTimerId);
      closeTimeoutRefs.current?.delete(badge.id);
      console.log(`[Modal initiateClose] Cleared auto-close timer for badge: ${badge.id}`);
    }
    // 애니메이션 타이머 클리어 (중복 방지)
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = undefined;
    }

    // 애니메이션 시간 후 부모 onClose 호출
    closeAnimTimerRef.current = window.setTimeout(() => {
      console.log(`[Modal initiateClose] Animation finished, calling parent onClose for badge: ${badge.id}`);
      onClose(); // 부모에게 알림 닫혔음을 알림 (badgeId는 부모가 알고 있음)
      // 여기서 isClosing.current = false;를 하면 안됨. onClose 후 부모가 컴포넌트를 제거해야 함
      closeAnimTimerRef.current = undefined;
    }, 300); // CSS transition duration
  }, [internalVisible, onClose, badge.id, closeTimeoutRefs]);

  // 모달 표시 및 자동 닫기 타이머 설정 Effect
  useEffect(() => {
    console.log(`[Modal useEffect] Mounting or badge changed for ID: ${badge.id}`);
    // 컴포넌트가 마운트되면 즉시 표시
    setInternalVisible(true);
    isClosing.current = false;

    // 자동 닫기 타이머 설정
    console.log(`[Modal useEffect] Starting auto-close timer (3s) for badge: ${badge.id}`);
    const timerId = window.setTimeout(() => {
      console.log(`[Modal setTimeout] Auto-closing modal for badge: ${badge.id}`);
      initiateClose(); // 3초 후 닫기 시작
    }, 3000);
    
    // 타이머 ID를 Ref Map에 저장
    closeTimeoutRefs.current?.set(badge.id, timerId);

    // 클린업 함수: 언마운트 시 타이머 정리
    return () => {
      console.log(`[Modal useEffect Cleanup] Clearing timer for badge: ${badge.id}`);
      clearTimeout(timerId);
      closeTimeoutRefs.current?.delete(badge.id);
      if (closeAnimTimerRef.current) {
          clearTimeout(closeAnimTimerRef.current);
          closeAnimTimerRef.current = undefined;
      }
    };
    // badge.id와 initiateClose에 의존
  }, [badge.id, initiateClose, closeTimeoutRefs]);

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
                  도전과제 달성!
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