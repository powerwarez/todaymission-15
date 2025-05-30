import React from "react";
import { useTheme } from "../hooks/useTheme";
import { LuPalette, LuSun, LuHeart } from "react-icons/lu";

interface ThemeManagerProps {
  className?: string;
}

const ThemeManager: React.FC<ThemeManagerProps> = ({ className = "" }) => {
  const { activeTheme, changeTheme, availableThemes } = useTheme();

  const themeInfo = {
    summer: {
      name: "여름 하늘",
      description: "파스텔톤 파란색과 하늘색",
      icon: LuSun,
      preview: "bg-sky-300",
    },
    pink: {
      name: "핑크 파스텔",
      description: "기존 파스텔 핑크 테마",
      icon: LuHeart,
      preview: "bg-pink-300",
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center mb-4">
        <LuPalette className="text-2xl text-sky-600 mr-2" />
        <h2 className="text-xl font-bold text-sky-700">테마 설정</h2>
      </div>

      <p className="text-gray-600 mb-6">
        앱의 전체 색상 테마를 변경할 수 있습니다. 현재 테마:{" "}
        <span className="font-semibold">{activeTheme.name}</span>
      </p>

      <div className="space-y-3">
        {availableThemes.map((themeKey) => {
          const theme = themeInfo[themeKey];
          const IconComponent = theme.icon;
          const isActive =
            activeTheme.name ===
            (themeKey === "summer" ? "여름 하늘" : "핑크 파스텔");

          return (
            <button
              key={themeKey}
              onClick={() => changeTheme(themeKey)}
              className={`w-full flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                isActive
                  ? "border-sky-500 bg-sky-50 shadow-md"
                  : "border-gray-200 hover:border-sky-300 hover:bg-gray-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full ${theme.preview} mr-3 flex items-center justify-center`}
              >
                <IconComponent className="text-white text-lg" />
              </div>

              <div className="flex-1 text-left">
                <h3
                  className={`font-semibold ${
                    isActive ? "text-sky-700" : "text-gray-700"
                  }`}
                >
                  {theme.name}
                </h3>
                <p
                  className={`text-sm ${
                    isActive ? "text-sky-600" : "text-gray-500"
                  }`}
                >
                  {theme.description}
                </p>
              </div>

              {isActive && (
                <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-sky-50 rounded-lg">
        <h4 className="font-semibold text-sky-700 mb-2">💡 개발자 팁</h4>
        <p className="text-sm text-sky-600">
          새로운 테마를 추가하려면{" "}
          <code className="bg-sky-100 px-1 rounded">src/theme/colors.ts</code>{" "}
          파일에서 새로운 색상 팔레트를 정의하고{" "}
          <code className="bg-sky-100 px-1 rounded">availableThemes</code>에
          추가하세요.
        </p>
      </div>
    </div>
  );
};

export default ThemeManager;
