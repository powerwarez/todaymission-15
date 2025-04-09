import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useNotificationState } from './hooks/useNotificationState';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import TodayMissionPage from './pages/TodayMissionPage';
import HallOfFamePage from './pages/HallOfFamePage';
import MissionSettingsPage from './pages/ChallengeSettingsPage';
import BadgeSettingsPage from './pages/BadgeSettingsPage';
import BadgeNotificationModal from './components/BadgeNotificationModal';

// PrivateRoute 컴포넌트: 인증된 사용자만 접근 가능
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-black">로딩 중...</h1>
          <p className="mt-2 text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
};

// PublicRoute 컴포넌트: 인증되지 않은 사용자만 접근 가능 (예: 로그인 페이지)
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-black">로딩 중...</h1>
          <p className="mt-2 text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }
  return !session ? children : <Navigate to="/" replace />;
};

// 실제 App 컴포넌트
const AppContent: React.FC = () => {
  // useAuth는 AuthProvider 내부에서만 호출 가능하므로 별도 컴포넌트로 분리
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<TodayMissionPage />} />
        <Route path="hall-of-fame" element={<HallOfFamePage />} />
        <Route path="mission-settings" element={<MissionSettingsPage />} />
        <Route path="settings" element={<Navigate to="/mission-settings" replace />} />
        <Route path="badge-settings" element={<BadgeSettingsPage />} />
      </Route>

      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* 정의되지 않은 모든 경로는 루트 또는 로그인 페이지로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// 최상위 App 컴포넌트: Provider들로 감싸기
const App: React.FC = () => {
  // useNotificationState 훅에서 반환 값 변경 사항 반영
  const {
    displayedBadges,
    handleCloseNotification, // 이제 badgeId를 인자로 받음
    showBadgeNotification,
    isLoadingBadge, 
    notificationQueue, // 추가됨
  } = useNotificationState();

  return (
    <AuthProvider>
      {/* Provider에는 show 함수만 포함된 객체를 value로 전달 */}
      <NotificationProvider value={{ showBadgeNotification }}>
        <AppContent />
        {/* 모달은 displayedBadges 배열을 순회하며 여러 개 렌더링 */}
        {displayedBadges.map((badge, index) => (
          <BadgeNotificationModal
            key={badge.id} // 각 모달 인스턴스는 고유 키 필요
            badge={badge} 
            // onClose는 이제 badgeId를 받아 handleCloseNotification 호출
            onClose={() => handleCloseNotification(badge.id)} 
            // 모달 위치를 조정하여 겹치지 않게 표시 (예: index 사용)
            style={{ 
              transform: `translateY(-${index * 110}%)`, // 각 모달을 위로 110% 만큼 이동
              zIndex: 9999 - index // 위에 쌓이는 모달이 더 높은 z-index 가짐
             }} 
          />
        ))}
        {/* 로딩 상태 표시 (선택 사항) */}
        {isLoadingBadge && notificationQueue.length > 0 && (
          <div className="fixed bottom-5 right-5 z-[9998] p-2 bg-gray-700 text-white text-xs rounded shadow-lg">
            새로운 배지 로딩 중...
          </div>
        )}
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
