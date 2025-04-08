import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationState } from '../hooks/useNotificationState'; // 상태 관리 훅 임포트

interface NotificationContextType {
  // 이제 Context는 실제 show 함수를 직접 노출합니다.
  showBadgeNotification: (badgeId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // useNotificationState 훅을 Provider 내부에서 호출하여 값을 얻음
  const { showBadgeNotification } = useNotificationState();

  // Context 값으로는 show 함수만 전달
  const contextValue = {
    showBadgeNotification,
  };

  return (
    // value prop 대신 Provider의 기본 방식으로 값 전달
    <NotificationContext.Provider value={contextValue}>
      {children}
      {/* 모달 렌더링은 App.tsx에서 처리 */}
    </NotificationContext.Provider>
  );
};

// Context를 사용하기 위한 커스텀 훅
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 