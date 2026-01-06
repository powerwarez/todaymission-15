import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuAward,
  LuSettings,
  LuChevronsLeft,
  LuChevronsRight,
  LuLogOut,
  LuBadge,
  LuMenu,
  LuX,
} from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const {
    isMinimized,
    isMobileOpen,
    isMobile,
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
  } = useSidebar();

  const menuItems = [
    { path: "/", name: "오늘의 미션", icon: LuLayoutDashboard },
    { path: "/hall-of-fame", name: "명예의 전당", icon: LuAward },
    { path: "/mission-settings", name: "오늘의 미션 설정", icon: LuSettings },
    { path: "/badge-settings", name: "달성한 도전과제", icon: LuBadge },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLinkClick = () => {
    closeMobileSidebar();
  };

  // 모바일 햄버거 버튼
  const MobileMenuButton = () => (
    <button
      onClick={toggleMobileSidebar}
      className="fixed top-4 left-4 z-50 p-2 rounded-lg md:hidden"
      style={{
        backgroundColor: "var(--color-primary-medium)",
        color: "white",
      }}
      aria-label="Toggle menu"
    >
      {isMobileOpen ? <LuX className="text-xl" /> : <LuMenu className="text-xl" />}
    </button>
  );

  // 모바일 오버레이
  const MobileOverlay = () =>
    isMobile && isMobileOpen ? (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
        onClick={closeMobileSidebar}
      />
    ) : null;

  // 사이드바 너비 결정
  const sidebarWidth = isMobile ? "w-64" : isMinimized ? "w-16" : "w-64";

  // 사이드바 위치 클래스
  const sidebarPositionClass = isMobile
    ? isMobileOpen
      ? "translate-x-0"
      : "-translate-x-full"
    : "";

  return (
    <>
      <MobileMenuButton />
      <MobileOverlay />
      <aside
        className={`fixed top-0 left-0 h-full p-4 flex flex-col justify-between transition-all duration-300 ease-in-out z-40 ${sidebarWidth} ${sidebarPositionClass}`}
        style={{
          backgroundColor: "var(--color-primary-light)",
          color: "var(--color-text-primary)",
        }}
      >
        <div>
          <div
            className={`flex items-center mb-8 ${
              !isMobile && isMinimized ? "justify-center" : "justify-between"
            }`}
          >
            {(isMobile || !isMinimized) && (
              <h1 className="text-2xl font-bold">오늘 미션!</h1>
            )}
          </div>
          <nav>
            <ul>
              {menuItems.map((item) => (
                <li key={item.path} className="mb-4">
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center p-2 rounded-lg transition-colors ${
                      location.pathname === item.path ||
                      (item.path === "/mission-settings" &&
                        location.pathname === "/settings")
                        ? "text-white"
                        : ""
                    } ${!isMobile && isMinimized ? "justify-center" : ""}`}
                    style={{
                      backgroundColor:
                        location.pathname === item.path ||
                        (item.path === "/mission-settings" &&
                          location.pathname === "/settings")
                          ? "var(--color-primary-medium)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (
                        !(
                          location.pathname === item.path ||
                          (item.path === "/mission-settings" &&
                            location.pathname === "/settings")
                        )
                      ) {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (
                        !(
                          location.pathname === item.path ||
                          (item.path === "/mission-settings" &&
                            location.pathname === "/settings")
                        )
                      ) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <item.icon
                      className={`text-xl ${
                        isMobile || !isMinimized ? "mr-3" : ""
                      }`}
                    />
                    {(isMobile || !isMinimized) && <span>{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full p-2 rounded-lg transition-colors ${
              !isMobile && isMinimized ? "justify-center" : ""
            }`}
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="Logout"
          >
            <LuLogOut
              className={`text-xl ${isMobile || !isMinimized ? "mr-3" : ""}`}
            />
            {(isMobile || !isMinimized) && <span>로그아웃</span>}
          </button>
          {/* 데스크탑에서만 사이드바 최소화 버튼 표시 */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg self-center transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              aria-label={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isMinimized ? (
                <LuChevronsRight className="text-xl" />
              ) : (
                <LuChevronsLeft className="text-xl" />
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
