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

  // 상태에 따른 원형 구슬 스타일 반환 (단색 배경)
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    // 기본 스타일: 원형, 그림자(md), 트랜지션, Flex 설정
    // 기록 없을 때의 기본 텍스트 색상도 여기서 관리할 수 있으나, 아이콘 색상과 별도로 처리하기 위해 분리
    const baseStyle = 'rounded-full shadow-md transition-colors duration-200 flex flex-col items-center justify-center font-bold';
    const sizeStyle = 'h-12 w-12';

    let bgColor = '';
    let textColor = 'text-white'; // 기본 텍스트 색상

    if (status.isCompleted === true) {
      bgColor = 'bg-green-500';
    } else if (status.isCompleted === false) {
      bgColor = 'bg-red-400';
    } else {
      bgColor = 'bg-gray-200';
      textColor = 'text-gray-600'; // 기록 없을 때 텍스트 색상 변경
    }
    return `${baseStyle} ${sizeStyle} ${bgColor} ${textColor}`;
  };

  // 상태에 따른 아이콘 반환
  const renderStatusIcon = (status: WeekdayStatus) => {
    const iconSize = 18;
    // 아이콘 색상은 배경색에 따라 결정 (기록 없을 때는 회색)
    const iconColor = status.isCompleted === null ? 'text-gray-500 opacity-80' : 'text-white opacity-80';

    if (status.isCompleted === true) {
      return <LuCheck size={iconSize} className={iconColor} />;
    } else if (status.isCompleted === false) {
      return <LuX size={iconSize} className={iconColor} />;
    } else {
      return <LuMinus size={iconSize} className={iconColor} />;
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center"> {/* shadow-lg 제거 */}
            <div className="text-center text-sm text-gray-400 animate-pulse">주간 현황 로딩 중...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg min-h-[280px] justify-center"> {/* shadow-lg 제거 */}
             <div className="text-center text-sm text-red-500">오류: {error}</div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg min-w-[80px]"> {/* shadow-lg 제거 */}
      <h3 className="text-lg font-semibold text-pink-700 mb-2">주간 달성</h3>
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex flex-col items-center"> {/* 세로 배치 유지 */}
          <div
            className={getStatusIndicatorStyle(status)} // 스타일 함수 적용 (텍스트 색상 포함)
            title={status.isCompleted === true ? `완료 (${status.date})` : status.isCompleted === false ? `미완료 (${status.date})` : `기록 없음 (${status.date})`}
          >
            {/* 원 안에 요일 텍스트와 아이콘 표시 */}
            <span className="text-xl leading-none font-extrabold">{dayNames[index]}</span> {/* 요일 텍스트 크기/굵기 조정 */}
            <div className="mt-1"> {/* 아이콘 위치 미세 조정 (0.5 -> 1) */}
               {renderStatusIcon(status)} {/* 상태 아이콘 */}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 