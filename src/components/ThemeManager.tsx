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

      {/* 개발자 가이드 */}
      <div
        className="mt-6 p-4 rounded-lg text-sm"
        style={{
          backgroundColor: "var(--color-bg-hover)",
          color: "var(--color-text-secondary)",
        }}
      >
        <h4 className="font-semibold mb-2">개발자 가이드</h4>
        <p className="mb-2">
          새로운 테마를 추가하려면{" "}
          <code className="bg-gray-200 px-1 rounded">src/theme/colors.ts</code>{" "}
          파일의
          <code className="bg-gray-200 px-1 rounded">themes</code> 객체에 새
          테마를 추가하세요.
        </p>
        <p>
          각 테마는 primary, background, text, border 색상 팔레트를 포함해야
          합니다.
        </p>
      </div>
    </div>
  );
};

export default ThemeManager;
