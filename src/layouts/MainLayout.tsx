import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../contexts/SidebarContext";

const MainLayout: React.FC = () => {
  const { isMinimized, isMobile } = useSidebar();

  // 동적 마진 계산
  // 모바일: 마진 없음 (사이드바가 오버레이로 표시됨)
  // 데스크탑 최소화: 64px (w-16)
  // 데스크탑 확장: 256px (w-64)
  const mainMarginLeft = isMobile ? "ml-0" : isMinimized ? "ml-16" : "ml-64";

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className={`min-h-screen p-4 sm:p-6 transition-all duration-300 ease-in-out ${mainMarginLeft}`}
      >
        {/* 모바일에서 햄버거 버튼 공간 확보 */}
        {isMobile && <div className="h-12" />}
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
