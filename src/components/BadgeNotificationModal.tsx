import React from 'react'; // useState, useEffect 제거 (useNotificationState에서 관리)
import { Badge } from '../types'; // Badge 타입
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge | null;
  onClose: () => void;
  isLoading: boolean; // isLoading prop 추가
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ badge, isLoading, onClose }) => {
  // isVisible 상태 및 관련 useEffect 제거 (이제 상위에서 isLoading과 badge로 제어)

  const handleClose = () => {
    // 애니메이션 효과를 원한다면, 여기서 바로 onClose를 호출하는 대신
    // 내부 상태(e.g., closing)를 변경하고 애니메이션 후 onClose 호출
    onClose();
  };

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
    // isVisible 대신 badge 존재 여부와 isLoading으로 표시 제어
    <div
      className={`fixed bottom-5 right-5 z-[9999] w-full max-w-sm transition-opacity duration-300 ease-in-out ${
        (badge || isLoading) ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
       {/* 모달 내용 렌더링 로직은 이전과 유사하게 isLoading과 badge 상태 사용 */}
       <div className="bg-white rounded-lg shadow-xl border border-pink-200 overflow-hidden">
         <div className="p-4">
           {isLoading ? (
             <p className="text-center text-gray-500">배지 정보 로딩 중...</p>
           ) : badge ? (
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
           ) : null }
         </div>
       </div>
    </div>
  );
};

export default BadgeNotificationModal; 