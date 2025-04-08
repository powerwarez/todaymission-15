import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuAward, LuSettings, LuChevronsLeft, LuChevronsRight, LuLogOut } from 'react-icons/lu'; // LogOut 아이콘 추가
import { useAuth } from '../contexts/AuthContext'; // useAuth 임포트

interface SidebarProps {
  isMinimized: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMinimized, toggleSidebar }) => {
  const location = useLocation();
  const { logout } = useAuth(); // logout 함수 가져오기

  const menuItems = [
    { path: '/', name: '오늘의 미션', icon: LuLayoutDashboard },
    { path: '/hall-of-fame', name: '명예의 전당', icon: LuAward },
    { path: '/settings', name: '도전과제 설정', icon: LuSettings },
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

  return (
    <aside
      className={`bg-pink-200 text-pink-800 h-screen p-4 flex flex-col justify-between transition-width duration-300 ease-in-out ${
        isMinimized ? 'w-16' : 'w-64'
      }`}
    >
      <div>
        <div className={`flex items-center mb-8 ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          {!isMinimized && <h1 className="text-2xl font-bold">오늘 미션!</h1>}
        </div>
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.path} className="mb-4">
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-lg hover:bg-pink-300 transition-colors ${
                    location.pathname === item.path ? 'bg-pink-400 text-white' : ''
                  } ${
                    isMinimized ? 'justify-center' : ''
                  }`}
                >
                  <item.icon className={`text-xl ${!isMinimized ? 'mr-3' : ''}`} />
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
          className={`flex items-center w-full p-2 rounded-lg hover:bg-pink-300 transition-colors ${
            isMinimized ? 'justify-center' : ''
          }`}
          aria-label="Logout"
        >
          <LuLogOut className={`text-xl ${!isMinimized ? 'mr-3' : ''}`} />
          {!isMinimized && <span>로그아웃</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-pink-300 self-center"
          aria-label={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isMinimized ? <LuChevronsRight className="text-xl" /> : <LuChevronsLeft className="text-xl" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 