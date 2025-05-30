import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen p-6 ml-64 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto">
          <Outlet /> {/* Child routes will render here */}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
