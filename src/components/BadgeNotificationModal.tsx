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

  // handleClose 정의를 useEffect보다 위로 이동하고 useCallback 적용
  const handleClose = useCallback(() => {
      // 이미 닫는 중이면 중복 실행 방지
      if (!internalVisible) return;

      console.log('[Modal handleClose] Start closing animation.');
      setInternalVisible(false); // 페이드 아웃 시작

      // 진행 중인 자동 닫기 타이머가 있다면 취소
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      // 이전 닫기 애니메이션 타이머도 취소
      if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current);

      // 애니메이션 시간 후 부모 onClose 호출 (window.setTimeout 사용)
      closeAnimTimerRef.current = window.setTimeout(() => {
           console.log('[Modal handleClose] Animation finished, calling parent onClose.');
           onClose(); // 부모 상태 업데이트 요청 (currentBadge=null, isProcessingQueue=false)
      }, 300); // opacity transition duration (300ms)
  // internalVisible을 의존성에 추가하여 항상 최신 상태 참조
  }, [internalVisible, onClose]);

  // 자동 닫기 및 표시 상태 관리
  useEffect(() => {
    // 로딩 중 아니고 새 배지 있으면 표시 & 자동 닫기 설정
    if (!isLoading && badge) {
      console.log('[Modal useEffect] Showing modal for badge:', badge.id);
      // 이전 타이머들 취소
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current);
      setInternalVisible(true); // 표시 시작

      console.log('[Modal useEffect] Starting auto-close timer for badge:', badge.id);
      autoCloseTimerRef.current = window.setTimeout(() => { // window.setTimeout 사용
        console.log('[Modal setTimeout] Auto-closing modal for badge:', badge.id);
        handleClose(); // 이제 useCallback으로 감싸진 함수 사용
      }, 5000); // 5초
    } else if (!isLoading && !badge && internalVisible) {
       // 로딩중 아니면서, badge는 null인데 아직 internalVisible=true인 경우 (닫기 시작됨)
       // 이 경우는 handleClose에서 처리하므로 여기서 setInternalVisible(false)를 호출할 필요는 없음.
       // 단, 외부에서 badge가 null로 바뀌면(예: 부모 상태 변경) internalVisible도 false로 맞춰줌
       // setInternalVisible(false); // 이 줄은 handleClose를 통해 제어되므로 불필요
    }

    // Cleanup
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (closeAnimTimerRef.current) clearTimeout(closeAnimTimerRef.current);
    };
  // useEffect 의존성 배열에 handleClose 추가
  }, [badge, isLoading, handleClose]);

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
                    onClick={handleClose} // X 버튼 클릭 시 내부 닫기 함수 호출
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