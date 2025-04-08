import React from 'react';
import { WeekdayStatus } from '../hooks/useWeeklyCompletionStatus';

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ['월', '화', '수', '목', '금'];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({ weekStatus, loading, error }) => {

  // 상태에 따른 원형 구슬 스타일 반환
  const getStatusIndicatorStyle = (status: WeekdayStatus): string => {
    if (status.isCompleted === true) {
      return 'bg-green-500'; // 완료: 녹색
    } else if (status.isCompleted === false) {
      return 'bg-red-400'; // 미완료 (기록 있음): 빨간색
    } else {
      return 'bg-gray-200'; // 기록 없음: 밝은 회색
    }
  };

  if (loading) {
    // 로딩 시에도 레이아웃 유지하도록 빈 슬롯 표시 (개선)
    return (
        <div className="flex flex-col items-center space-y-3 p-4 bg-white rounded-lg shadow-inner min-h-[180px] justify-center">
            <div className="text-center text-sm text-gray-400 animate-pulse">주간 현황 로딩 중...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center space-y-3 p-4 bg-white rounded-lg shadow-inner min-h-[180px] justify-center">
             <div className="text-center text-sm text-red-500">오류: {error}</div>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-lg min-w-[80px]"> {/* 패딩, 그림자, 최소 너비 조정 */}
      <h3 className="text-md font-semibold text-pink-700 mb-2">주간 달성</h3> {/* 글자 크기, 색상, 마진 조정 */}
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex items-center space-x-3 w-full justify-center"> {/* 간격, 정렬 조정 */}
          <span className="font-bold text-gray-800 text-lg w-5 text-center">{dayNames[index]}</span> {/* 요일 폰트 크기, 굵기 조정 */}
          <div
            className={`h-6 w-6 rounded-full shadow-md ${getStatusIndicatorStyle(status)}`} // 원 크기 및 스타일 적용, 그림자 추가
            title={status.isCompleted === true ? `완료 (${status.date})` : status.isCompleted === false ? `미완료 (${status.date})` : `기록 없음 (${status.date})`}
          >
            {/* 내용 없이 색상으로만 표시 */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 