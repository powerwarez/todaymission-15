import React, { useState, useEffect } from 'react';
import { Badge } from '../types'; // Badge 타입 정의 필요 (또는 필요한 속성만 정의)
import { LuX, LuBadgeCheck } from 'react-icons/lu';

interface BadgeNotificationModalProps {
  badge: Badge | null; // 표시할 배지 정보 (null이면 숨김)
  onClose: () => void; // 닫기 함수
}

const BadgeNotificationModal: React.FC<BadgeNotificationModalProps> = ({ badge, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      // 5초 후에 자동으로 닫기
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [badge]); // badge 객체가 변경될 때마다 실행

  const handleClose = () => {
    setIsVisible(false);
    // 애니메이션 시간(300ms) 후 onClose 호출하여 부모 상태 업데이트
    setTimeout(onClose, 300);
  };

  // 이미지 URL 생성 함수 (현재 사용되지 않음)
  // const getBadgeImageUrl = (imagePath: string | undefined): string => {
    // ... (이전 함수 내용)
  // };

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
            <div className="flex items-start">
              {/* 이미지 표시 부분 주석 처리 */}
              {/*
              <div className="flex-shrink-0 pt-0.5">
                 <img
                    className="h-12 w-12 object-contain mr-3"
                    src={getBadgeImageUrl(badge.image_path)}
                    alt={badge.name}
                    onError={(e) => { // 이미지 로드 에러 시 콘솔 로그 추가
                        console.error("Image load error for:", getBadgeImageUrl(badge.image_path));
                        (e.target as HTMLImageElement).src = '/placeholder_badge.png'; // 에러 시 기본 이미지로 대체
                    }}
                  />
              </div>
              */}
              {/* 텍스트 내용 부분 (ml-3 제거하여 왼쪽 정렬) */}
              <div className="w-0 flex-1">
                <p className="text-sm font-semibold text-pink-700 flex items-center">
                  <LuBadgeCheck className="mr-1 text-green-500" />
                  도전과제 달성!
                </p>
                <p className="mt-1 text-lg font-bold text-gray-800">{badge.name}</p>
                {badge.description && (
                  <p className="mt-1 text-sm text-gray-600">{badge.description}</p>
                )}
              </div>
              {/* 닫기 버튼 부분 */}
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