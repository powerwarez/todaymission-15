import React from 'react';
import { WeekdayStatus } from '../hooks/useWeeklyCompletionStatus';
// import { LuCheck, LuX, LuMinus } from 'react-icons/lu'; // 아이콘 임포트 제거

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ['월', '화', '수', '목', '금'];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({ weekStatus, loading, error }) => {

  // 상태에 따른 원형 구슬 스타일 반환
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    const baseStyle = 'rounded-full shadow-md transition-colors duration-200 flex items-center justify-center font-extrabold'; // 텍스트 가운데 정렬 및 굵기 조정
    const sizeStyle = 'h-12 w-12';

    let bgColor = '';
    let textColor = 'text-white';

    if (status.isCompleted === true) {
      bgColor = 'bg-green-500';
    } else if (status.isCompleted === false) {
      bgColor = 'bg-red-400';
    } else {
      bgColor = 'bg-gray-200';
      textColor = 'text-gray-600';
    }
    return `${baseStyle} ${sizeStyle} ${bgColor} ${textColor}`;
  };

  // 아이콘 렌더링 함수 제거
  /*
  const renderStatusIcon = (status: WeekdayStatus) => {
    ...
  };
  */

  // 로딩 및 에러 처리 (변경 없음)
  if (loading) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center">
            <div className="text-center text-sm text-gray-400 animate-pulse">주간 현황 로딩 중...</div>
        </div>
    );
  }
  if (error) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center">
             <div className="text-center text-sm text-red-500">오류: {error}</div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-3 p-6 bg-white rounded-lg min-w-[80px]"> {/* 간격 재조정 */}
      <h3 className="text-lg font-semibold text-pink-700 mb-2">주간 미션</h3>
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex flex-col items-center"> 
          <div
            className={getStatusIndicatorStyle(status)}
            title={status.isCompleted === true ? `완료 (${status.date})` : status.isCompleted === false ? `미완료 (${status.date})` : `기록 없음 (${status.date})`}
          >
            {/* 원 안에 요일 텍스트만 표시 */}
            <span className="text-2xl leading-none">{dayNames[index]}</span> {/* 텍스트 크기 조정 */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 