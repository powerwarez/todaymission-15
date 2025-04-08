import React from 'react';
import { WeekdayStatus } from '../hooks/useWeeklyCompletionStatus';
import { LuCheck, LuX, LuMinus } from 'react-icons/lu'; // 사용할 아이콘 임포트

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ['월', '화', '수', '목', '금'];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({ weekStatus, loading, error }) => {

  // 상태에 따른 원형 구슬 스타일 반환
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    const baseStyle = 'rounded-full shadow-md transition-colors duration-200 flex flex-col items-center justify-center text-white font-bold'; // Flex, 텍스트 스타일 추가
    const sizeStyle = 'h-12 w-12'; // 크기 재조정 (텍스트/아이콘 공간 확보)

    let gradientStyle = '';
    if (status.isCompleted === true) {
      gradientStyle = 'bg-gradient-radial from-green-400 to-green-600';
    } else if (status.isCompleted === false) {
      gradientStyle = 'bg-gradient-radial from-red-400 to-red-600';
    } else {
      gradientStyle = 'bg-gradient-radial from-gray-300 to-gray-400';
    }
    return `${baseStyle} ${sizeStyle} ${gradientStyle}`;
  };

  // 상태에 따른 아이콘 반환
  const renderStatusIcon = (status: WeekdayStatus) => {
    const iconSize = 16; // 아이콘 크기
    if (status.isCompleted === true) {
      return <LuCheck size={iconSize} />; // 완료 아이콘
    } else if (status.isCompleted === false) {
      return <LuX size={iconSize} />; // 미완료 아이콘
    } else {
      return <LuMinus size={iconSize} />; // 기록 없음 아이콘
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-inner min-h-[280px] justify-center"> {/* 높이 재조정 */} 
            <div className="text-center text-sm text-gray-400 animate-pulse">주간 현황 로딩 중...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-inner min-h-[280px] justify-center"> {/* 높이 재조정 */} 
             <div className="text-center text-sm text-red-500">오류: {error}</div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg min-w-[80px]"> {/* 간격, 최소 너비 재조정 */} 
      <h3 className="text-lg font-semibold text-pink-700 mb-2">주간 달성</h3> {/* 마진 재조정 */} 
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex flex-col items-center"> {/* 세로 배치 */} 
          <div
            className={getStatusIndicatorStyle(status)} // 스타일 함수 적용
            title={status.isCompleted === true ? `완료 (${status.date})` : status.isCompleted === false ? `미완료 (${status.date})` : `기록 없음 (${status.date})`}
          >
            {/* 원 안에 요일 텍스트와 아이콘 표시 */}
            <span className="text-lg leading-none">{dayNames[index]}</span> {/* 요일 텍스트 */}
            <div className="mt-px"> {/* 아이콘 위치 조정을 위한 div */} 
               {renderStatusIcon(status)} {/* 상태 아이콘 */} 
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 