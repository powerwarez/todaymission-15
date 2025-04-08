import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import TodayMissionPage from './pages/TodayMissionPage';
import HallOfFamePage from './pages/HallOfFamePage';
import ChallengeSettingsPage from './pages/ChallengeSettingsPage';

// PrivateRoute 컴포넌트: 인증된 사용자만 접근 가능
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>; // 로딩 중 표시
  }
  return session ? children : <Navigate to="/login" replace />;
};

// PublicRoute 컴포넌트: 인증되지 않은 사용자만 접근 가능 (예: 로그인 페이지)
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>; // 로딩 중 표시
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
        <Route path="settings" element={<ChallengeSettingsPage />} />
        {/* 다른 보호된 라우트가 있다면 여기에 추가 */}
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

// 최상위 App 컴포넌트: AuthProvider 래핑
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
