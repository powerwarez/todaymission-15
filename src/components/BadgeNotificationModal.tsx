import React, { useState, useEffect } from 'react';
import { Badge } from '../types'; // Badge 타입 정의 필요 (또는 필요한 속성만 정의)
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge | null; // 표시할 배지 정보 (null이면 숨김)
  onClose: () => void; // 닫기 함수
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ badge, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  // console.log('[Modal] Rendering. Badge:', badge, 'isVisible:', isVisible);

  useEffect(() => {
    // console.log('[Modal useEffect] Running. New badge prop:', badge);
    if (badge) {
      // console.log('[Modal useEffect] Badge found, setting isVisible to true.');
      setIsVisible(true);
      // 5초 후에 자동으로 닫기
      const timer = setTimeout(() => {
        // console.log('[Modal setTimeout] Closing modal automatically.');
        handleClose();
      }, 5000);
      return () => {
        // console.log('[Modal useEffect Cleanup] Clearing timeout.');
        clearTimeout(timer);
      }
    } else {
      // console.log('[Modal useEffect] Badge is null, setting isVisible to false.');
      // badge가 null이면 즉시 숨김 (이 경우는 handleClose를 통해 이미 false가 될 것임)
      // 하지만 초기 렌더링 시 badge가 null이면 이 부분이 실행될 수 있음
      setIsVisible(false);
    }
  }, [badge]); // badge 객체가 변경될 때마다 실행

  const handleClose = () => {
    // console.log('[Modal handleClose] Setting isVisible to false.');
    setIsVisible(false);
    // 애니메이션 시간(300ms) 후 onClose 호출하여 부모 상태 업데이트
    // console.log('[Modal handleClose] Calling parent onClose after 300ms.');
    setTimeout(onClose, 300);
  };

  // 이미지 URL 생성 함수 주석 해제
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
    <div
      className={`fixed bottom-5 right-5 z-[9999] w-full max-w-sm transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      } ${
        !badge ? 'pointer-events-none' : '' // 숨겨졌을 때 클릭 방지
      }`}
    >
      {badge && (
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
                  onClick={handleClose}
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <span className="sr-only">Close</span>
                  <LuX className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeNotificationModal; 