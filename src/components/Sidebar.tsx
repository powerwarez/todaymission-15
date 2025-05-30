import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuAward,
  LuSettings,
  LuChevronsLeft,
  LuChevronsRight,
  LuLogOut,
  LuBadge,
} from "react-icons/lu"; // LogOut, Badge 아이콘 추가
import { useAuth } from "../contexts/AuthContext"; // useAuth 임포트

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout } = useAuth(); // logout 함수 가져오기
  const [isMinimized, setIsMinimized] = useState(false);

  const menuItems = [
    { path: "/", name: "오늘의 미션", icon: LuLayoutDashboard },
    { path: "/hall-of-fame", name: "명예의 전당", icon: LuAward },
    { path: "/mission-settings", name: "오늘의 미션 설정", icon: LuSettings }, // 경로 및 이름 변경
    { path: "/badge-settings", name: "도전과제 설정", icon: LuBadge }, // 새로운 항목 추가
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // 로그아웃 성공 시 AuthContext가 상태를 변경하고 App.tsx의 라우팅 로직에 의해 로그인 페이지로 이동됨
    } catch (error) {
      console.error("Logout failed:", error);
      // 필요시 사용자에게 에러 알림
    }
  };

  const toggleSidebar = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full p-4 flex flex-col justify-between transition-width duration-300 ease-in-out z-10 ${
        isMinimized ? "w-16" : "w-64"
      }`}
      style={{
        backgroundColor: "var(--color-primary-light)",
        color: "var(--color-text-primary)",
      }}
    >
      <div>
        <div
          className={`flex items-center mb-8 ${
            isMinimized ? "justify-center" : "justify-between"
          }`}
        >
          {!isMinimized && <h1 className="text-2xl font-bold">오늘 미션!</h1>}
        </div>
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.path} className="mb-4">
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-lg transition-colors ${
                    // 현재 경로가 /settings 또는 /mission-settings일 때 활성화 (기존 경로 호환)
                    location.pathname === item.path ||
                    (item.path === "/mission-settings" &&
                      location.pathname === "/settings")
                      ? "text-white"
                      : ""
                  } ${isMinimized ? "justify-center" : ""}`}
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
                    className={`text-xl ${!isMinimized ? "mr-3" : ""}`}
                  />
                  {!isMinimized && <span>{item.name}</span>}
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
            isMinimized ? "justify-center" : ""
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
          <LuLogOut className={`text-xl ${!isMinimized ? "mr-3" : ""}`} />
          {!isMinimized && <span>로그아웃</span>}
        </button>
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
      </div>
    </aside>
  );
};

export default Sidebar;
