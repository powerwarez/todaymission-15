import React, { useState, useEffect, useRef, useCallback } from 'react'; // useState, useRef, useCallback 추가
import { Badge } from '../types'; // Badge 타입
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge | null;
  onClose: () => void;
  isLoading: boolean; // isLoading prop 추가
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ badge, isLoading, onClose }) => {
  // 내부 표시 상태 추가
  const [internalVisible, setInternalVisible] = useState(false);
  // useRef 초기값 undefined 명시
  const autoCloseTimerRef = useRef<number | undefined>(undefined);
  const closeAnimTimerRef = useRef<number | undefined>(undefined);
  // 닫기 진행 중 상태 Ref (중복 호출 방지용)
  const isClosing = useRef(false);

  // 닫기 시작 함수 (타이머 또는 X 버튼에서 호출)
  const initiateClose = useCallback(() => {
    // 이미 닫는 중이거나 보이지 않으면 실행 안함
    if (!internalVisible || isClosing.current) return;

    console.log('[Modal initiateClose] Starting closing process.');
    isClosing.current = true; // 닫기 시작 플래그
    setInternalVisible(false); // 페이드 아웃 애니메이션 시작

    // 기존 타이머들 클리어 (중복 방지)
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = undefined;
    }
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = undefined;
    }

    // 애니메이션 시간 후 부모 onClose 호출
    closeAnimTimerRef.current = window.setTimeout(() => {
      console.log('[Modal initiateClose] Animation finished, calling parent onClose.');
      onClose(); // 부모에게 알림 닫혔음을 알림
      isClosing.current = false; // 닫기 완료 플래그 리셋
      closeAnimTimerRef.current = undefined; // 타이머 참조 초기화
    }, 300); // CSS transition duration
  }, [internalVisible, onClose]);

  // 표시 상태 및 자동 닫기 타이머 관리 Effect
  useEffect(() => {
    // 이전 타이머 정리 (중요)
    const clearTimers = () => {
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = undefined;
        }
        if (closeAnimTimerRef.current) {
          clearTimeout(closeAnimTimerRef.current);
          closeAnimTimerRef.current = undefined;
        }
    }

    // 로딩 중 아니고 새 배지가 도착했을 때만 모달 표시
    if (!isLoading && badge && !isClosing.current) {
      console.log('[Modal useEffect] Received new badge:', badge.id);
      clearTimers(); // 이전 타이머 확실히 제거
      isClosing.current = false; // 새 배지이므로 닫기 플래그 리셋
      setInternalVisible(true); // 모달 표시 (페이드 인)

      // 새로운 자동 닫기 타이머 설정
      console.log('[Modal useEffect] Starting auto-close timer for badge:', badge.id);
      autoCloseTimerRef.current = window.setTimeout(() => {
        console.log('[Modal setTimeout] Auto-closing modal for badge:', badge.id);
        initiateClose(); // 4초 후 닫기 시작
      }, 3000);
    } else if (internalVisible && (!badge || isLoading) && !isClosing.current) {
       // badge가 null이 되거나 로딩 상태가 되면 (부모 상태 변경) 즉시 닫기 시작
       console.log('[Modal useEffect] Badge became null or isLoading became true, initiating close.');
       initiateClose();
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return clearTimers;
  }, [badge, isLoading, initiateClose]);

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

  // badge가 null이고 로딩 중도 아닐 때 컴포넌트 자체를 렌더링하지 않음
  if (!badge && !isLoading) {
    return null;
  }

  return (
    // internalVisible 상태에 따라 opacity 제어
    <div
      className={`fixed bottom-5 right-5 z-[9999] w-full max-w-sm transition-opacity duration-300 ease-in-out ${
        internalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
       {/* 내용은 로딩 중이거나 배지가 있을 때만 렌더링 (애니메이션과 별개) */}
       {(isLoading || badge) && (
         <div className="bg-white rounded-lg shadow-xl border border-pink-200 overflow-hidden">
           <div className="p-4">
             {isLoading ? (
               <p className="text-center text-gray-500">배지 정보 로딩 중...</p>
             ) : badge ? ( // badge가 null이 아닐 때만 내용을 그림
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
             ) : null } {/* badge가 null이면 내용 안 그림 */}
           </div>
         </div>
       )}
    </div>
  );
};

export default BadgeNotificationModal; 