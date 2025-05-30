import React from "react";
import { useTheme } from "../hooks/useTheme";
import { themes } from "../theme/colors";

const ThemeManager: React.FC = () => {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h3
        className="text-lg font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        테마 설정
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(themes).map(([themeKey, theme]) => (
          <div
            key={themeKey}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              currentTheme === themeKey
                ? "ring-2 ring-offset-2 transform scale-105"
                : "hover:shadow-md"
            }`}
            style={{
              backgroundColor: theme.colors.background.card,
              borderColor:
                currentTheme === themeKey
                  ? theme.colors.border.focus
                  : theme.colors.border.light,
            }}
            onClick={() => setTheme(themeKey)}
          >
            {/* 테마 미리보기 색상 팔레트 */}
            <div className="flex space-x-2 mb-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: theme.colors.primary.light }}
              />
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: theme.colors.primary.DEFAULT }}
              />
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: theme.colors.primary.medium }}
              />
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: theme.colors.primary.dark }}
              />
            </div>

            {/* 테마 정보 */}
            <h4
              className="font-semibold text-lg mb-1"
              style={{ color: theme.colors.text.primary }}
            >
              {theme.displayName}
            </h4>
            <p
              className="text-sm"
              style={{ color: theme.colors.text.secondary }}
            >
              {theme.description}
            </p>

            {/* 현재 선택된 테마 표시 */}
            {currentTheme === themeKey && (
              <div className="mt-2 flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: theme.colors.primary.medium }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: theme.colors.text.primary }}
                >
                  현재 선택됨
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemeManager;
