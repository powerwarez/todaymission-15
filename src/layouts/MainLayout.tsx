import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const MainLayout: React.FC = () => {
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarMinimized(!isSidebarMinimized);
  };

  return (
    <div className="flex h-screen bg-pink-50">
      <Sidebar isMinimized={isSidebarMinimized} toggleSidebar={toggleSidebar} />
      <main
        className={`flex-1 p-6 transition-all duration-300 ease-in-out ${
          isSidebarMinimized ? 'ml-12' : 'ml-12'
        }`}
      >
        <Outlet /> {/* Child routes will render here */}
      </main>
    </div>
  );
};

export default MainLayout; 