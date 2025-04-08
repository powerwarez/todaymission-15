import React from 'react';
import { WeekdayStatus } from '../hooks/useWeeklyCompletionStatus';

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ['월', '화', '수', '목', '금'];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({ weekStatus, loading, error }) => {

  // 상태에 따른 원형 구슬 스타일 반환 (그래디언트 추가)
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    // 기본 스타일: 원형, 그림자, 트랜지션
    const baseStyle = 'rounded-full shadow-md transition-colors duration-200';
    // 크기 스타일
    const sizeStyle = 'h-10 w-10'; // 크기 키움 (h-6 w-6 -> h-10 w-10)

    let gradientStyle = '';
    if (status.isCompleted === true) {
      // 완료: 녹색 (중앙 밝게)
      gradientStyle = 'bg-gradient-radial from-green-400 to-green-600';
    } else if (status.isCompleted === false) {
      // 미완료: 빨간색 (중앙 밝게)
      gradientStyle = 'bg-gradient-radial from-red-400 to-red-600';
    } else {
      // 기록 없음: 회색 (중앙 밝게)
      gradientStyle = 'bg-gradient-radial from-gray-300 to-gray-400';
    }
    return `${baseStyle} ${sizeStyle} ${gradientStyle}`;
  };

  if (loading) {
    // 로딩 시에도 레이아웃 유지 (높이 조정)
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-inner min-h-[240px] justify-center"> {/* 높이 증가 */} 
            <div className="text-center text-sm text-gray-400 animate-pulse">주간 현황 로딩 중...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-inner min-h-[240px] justify-center"> {/* 높이 증가 */} 
             <div className="text-center text-sm text-red-500">오류: {error}</div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-5 p-6 bg-white rounded-lg shadow-lg min-w-[90px]"> {/* 패딩, 간격, 최소 너비 조정 */} 
      <h3 className="text-lg font-semibold text-pink-700 mb-3">주간 달성</h3> {/* 글자 크기, 마진 조정 */} 
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex items-center space-x-4 w-full justify-center"> {/* 간격 조정 */} 
          <span className="font-bold text-gray-800 text-xl w-6 text-center">{dayNames[index]}</span> {/* 요일 폰트 크기, 너비 조정 */} 
          <div
            className={getStatusIndicatorStyle(status)} // 스타일 함수 적용
            title={status.isCompleted === true ? `완료 (${status.date})` : status.isCompleted === false ? `미완료 (${status.date})` : `기록 없음 (${status.date})`}
          >
            {/* 구슬 효과를 위한 빈 div */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 