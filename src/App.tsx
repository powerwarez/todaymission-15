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
  // useNotificationState 훅을 여기서 직접 사용
  const notificationState = useNotificationState(); // 훅의 모든 반환값을 객체로 받음

  return (
    <AuthProvider>
      {/* Provider에는 훅의 반환값 전체를 value로 전달 */}
      <NotificationProvider value={notificationState}>
        <AppContent />
        {/* 모달은 App 레벨에서 상태를 직접 받아 렌더링 */}
        <BadgeNotificationModal
            badge={notificationState.currentBadge}
            onClose={notificationState.handleCloseNotification}
        />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
