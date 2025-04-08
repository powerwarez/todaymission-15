import React from 'react';
import { WeekdayStatus } from '../hooks/useWeeklyCompletionStatus';
import { FaCheckCircle, FaRegCircle, FaQuestionCircle } from 'react-icons/fa'; // Font Awesome 아이콘 사용

interface WeeklyStatusDisplayProps {
  weekStatus: WeekdayStatus[];
  loading: boolean;
  error: string | null;
}

const dayNames = ['월', '화', '수', '목', '금'];

const WeeklyStatusDisplay: React.FC<WeeklyStatusDisplayProps> = ({ weekStatus, loading, error }) => {

  const renderStatusIcon = (status: WeekdayStatus) => {
    if (status.isCompleted === true) {
      return <FaCheckCircle className="text-green-500" title={`완료 (${status.date})`} />;
    } else if (status.isCompleted === false) {
      return <FaRegCircle className="text-gray-400" title={`미완료 (${status.date})`} />; // 빈 원 아이콘
    } else {
      // 데이터가 없는 경우 (스냅샷 없음)
      return <FaQuestionCircle className="text-gray-300" title={`기록 없음 (${status.date})`} />;
    }
  };

  if (loading) {
    return <div className="text-center text-sm text-gray-500">주간 현황 로딩 중...</div>;
  }

  if (error) {
    return <div className="text-center text-sm text-red-500">오류: {error}</div>;
  }

  return (
    <div className="flex flex-col items-center space-y-3 p-4 bg-white rounded-lg shadow-inner">
      <h3 className="text-sm font-semibold text-pink-600 mb-1">주간 달성</h3>
      {weekStatus.map((status, index) => (
        <div key={status.dayIndex} className="flex items-center space-x-2">
          <span className="font-medium text-gray-700 text-sm w-4 text-center">{dayNames[index]}</span>
          {renderStatusIcon(status)}
        </div>
      ))}
    </div>
  );
};

export default WeeklyStatusDisplay; 