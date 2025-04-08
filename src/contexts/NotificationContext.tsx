import React, { createContext, useContext, ReactNode } from 'react';
import { Badge } from '../types';

// Context가 제공할 값의 타입 정의
interface NotificationContextType {
  currentBadge: Badge | null;
  handleCloseNotification: () => void;
  showBadgeNotification: (badgeId: string) => Promise<void>;
}

// Context 생성 (기본값은 undefined)
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider Props 타입 정의
interface NotificationProviderProps {
  children: ReactNode;
  value: NotificationContextType; // Provider가 받을 값
}

// Provider 컴포넌트: 외부에서 받은 value를 그대로 전달
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, value }) => {
  return (
    <NotificationContext.Provider value={value}>
      {children}
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