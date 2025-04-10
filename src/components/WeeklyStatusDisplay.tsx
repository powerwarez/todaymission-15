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
    let textColor = 'text-gray-700';
    let borderStyle = ''; // 테두리 스타일 추가
    
    // 진행률에 따른 색상 처리
    if (status.totalMissions > 0) {
      const ratio = status.completionRatio;
      
      if (ratio >= 1.0) {
        // 100% 완료: 진한 녹색
        bgColor = 'bg-green-500';
        textColor = 'text-white';
      } else if (ratio > 0) {
        // 일부 완료: 진행도에 따라 색상 강도 결정
        // 회색 -> 연한 녹색 -> 중간 녹색으로 단계별 변경
        if (ratio < 0.25) {
          bgColor = 'bg-gray-300';
        } else if (ratio < 0.5) {
          bgColor = 'bg-green-100';
        } else if (ratio < 0.75) {
          bgColor = 'bg-green-200';
        } else {
          bgColor = 'bg-green-300';
        }
      } else {
        // 미완료: 회색 배경
        bgColor = 'bg-gray-200';
      }
    } else {
      // 미션이 없는 경우: 연한 회색
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-400';
    }

    // 오늘 날짜인 경우 테두리 추가
    if (status.isToday) {
      borderStyle = 'border-4 border-pink-500 scale-110';
    }

    return `${baseStyle} ${sizeStyle} ${bgColor} ${textColor} ${borderStyle}`;
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
            title={
              status.totalMissions > 0 
                ? `${status.completedMissions}/${status.totalMissions} 미션 완료 (${status.date})` 
                : `미션 없음 (${status.date})`
            }
          >
            {/* 원 안에 요일 텍스트만 표시 */}
            <span className={`text-2xl leading-none ${status.isToday ? 'animate-pulse' : ''}`}>{dayNames[index]}</span> {/* 오늘 날짜는 깜빡임 효과 추가 */}
          </div>
          {status.isToday && <span className="text-xs text-pink-600 mt-1 font-bold">오늘</span>} {/* 오늘 날짜 아래에 텍스트 추가 */}
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 