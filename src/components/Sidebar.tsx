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
  LuStar,
} from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import Button from "./ui/Button";

const menuItems = [
  {
    path: "/",
    name: "오늘의 미션",
    icon: LuLayoutDashboard,
  },
  {
    path: "/hall-of-fame",
    name: "명예의 전당",
    icon: LuAward,
  },
  {
    path: "/mission-settings",
    name: "오늘의 미션 설정",
    icon: LuSettings,
  },
  {
    path: "/badge-settings",
    name: "달성한 도전과제",
    icon: LuBadge,
  },
];

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // 라벨 표시 여부: 모바일이거나 펼쳐진 상태
  const showLabel = isMobile || !isMinimized;

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/mission-settings" && location.pathname === "/settings");

  // 사이드바 너비
  const sidebarWidth = isMobile ? "w-64" : isMinimized ? "w-20" : "w-64";

  // 모바일 슬라이드
  const sidebarPositionClass = isMobile
    ? isMobileOpen
      ? "translate-x-0"
      : "-translate-x-full"
    : "";

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      {isMobile && (
        <Button
          variant="primary"
          iconOnly
          onClick={toggleMobileSidebar}
          className="fixed top-3 left-3 z-50"
          aria-label={isMobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <LuX size={22} /> : <LuMenu size={22} />}
        </Button>
      )}

      {/* 모바일 오버레이 */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: "var(--ui-overlay)" }}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full p-3 flex flex-col justify-between transition-all duration-300 ease-in-out z-40 ${sidebarWidth} ${sidebarPositionClass}`}
        style={{
          backgroundColor: "var(--ui-surface)",
          color: "var(--ui-text)",
          borderRight: "var(--ui-bw) solid var(--ui-ink)",
        }}
        aria-label="주요 메뉴"
      >
        <div>
          {/* 로고 */}
          <div
            className={`flex items-center gap-3 mb-6 mt-1 ${
              showLabel ? "px-1" : "justify-center"
            } ${isMobile ? "pl-14" : ""}`}
          >
            {!isMobile && (
              <span
                className="inline-flex items-center justify-center flex-none"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: "var(--ui-accent)",
                  color: "var(--ui-on-accent)",
                  border: "var(--ui-bw) solid var(--ui-ink)",
                  borderRadius: "var(--ui-radius-md)",
                  boxShadow: "var(--ui-shadow-sm)",
                }}
                aria-hidden="true"
              >
                <LuStar size={22} />
              </span>
            )}
            {showLabel && (
              <span
                className="text-xl font-extrabold"
                style={{ fontFamily: "var(--font-cute)" }}
              >
                오늘 미션!
              </span>
            )}
          </div>

          <nav aria-label="페이지 이동">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={`ui-nav-item ${showLabel ? "" : "justify-center"}`}
                    style={showLabel ? undefined : { padding: "0.5rem" }}
                    aria-current={isActive(item.path) ? "page" : undefined}
                    title={showLabel ? undefined : item.name}
                  >
                    <item.icon size={22} className="flex-none" />
                    {showLabel && <span>{item.name}</span>}
                    {!showLabel && <span className="sr-only">{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className={`ui-nav-item w-full ${showLabel ? "" : "justify-center"}`}
            style={showLabel ? undefined : { padding: "0.5rem" }}
            aria-label="로그아웃"
            title={showLabel ? undefined : "로그아웃"}
          >
            <LuLogOut size={22} className="flex-none" />
            {showLabel && <span>로그아웃</span>}
          </button>

          {/* 데스크탑에서만 사이드바 최소화 버튼 표시 */}
          {!isMobile && (
            <Button
              variant="ghost"
              iconOnly
              onClick={toggleSidebar}
              className="self-center"
              aria-label={isMinimized ? "사이드바 펼치기" : "사이드바 접기"}
            >
              {isMinimized ? (
                <LuChevronsRight size={22} />
              ) : (
                <LuChevronsLeft size={22} />
              )}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
