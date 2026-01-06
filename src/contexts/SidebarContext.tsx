import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContextType {
  isMinimized: boolean;
  isMobileOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

interface SidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 초기 체크
    checkMobile();

    // 리사이즈 이벤트 리스너
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 모바일에서 페이지 이동 시 사이드바 닫기
  const closeMobileSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isMinimized,
        isMobileOpen,
        isMobile,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

