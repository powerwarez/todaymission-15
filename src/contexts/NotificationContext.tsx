import React, { createContext, useContext, ReactNode } from 'react';

// Context가 제공할 값의 타입 정의 (show 함수만)
interface NotificationContextType {
  showBadgeNotification: (badgeId: string) => void;
}

// Context 생성
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider Props 타입 정의
interface NotificationProviderProps {
  children: ReactNode;
  value: Pick<NotificationContextType, 'showBadgeNotification'>; // show 함수만 포함하는 값
}

// Provider 컴포넌트: 외부에서 받은 value(show 함수)를 전달
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, value }) => {
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Context를 사용하기 위한 커스텀 훅 (show 함수만 반환)
export const useNotification = (): Pick<NotificationContextType, 'showBadgeNotification'> => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  // 전체 context 객체 대신 필요한 함수만 반환하도록 할 수도 있음
  return { showBadgeNotification: context.showBadgeNotification };
}; 