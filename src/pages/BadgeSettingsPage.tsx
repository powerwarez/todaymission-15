import React from 'react';

const BadgeSettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-pink-700 mb-6">도전과제 설정</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-pink-600 mb-4">도전과제 (배지) 관리</h2>
        <p className="text-gray-500">이 기능은 아직 준비 중입니다.</p>
        {/* TODO: Add challenge/badge creation/management UI here */}
      </div>
    </div>
  );
};

export default BadgeSettingsPage; 