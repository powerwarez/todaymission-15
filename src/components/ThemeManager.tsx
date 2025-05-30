import React from "react";
import { useTheme } from "../hooks/useTheme";
import { themes } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { LuLoader, LuCheck, LuCloud, LuHardDrive } from "react-icons/lu";

const ThemeManager: React.FC = () => {
  const { currentTheme, setTheme, isLoading, isSaving } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          테마 설정
        </h3>

        {/* 저장 상태 표시 */}
        <div className="flex items-center space-x-2 text-sm">
          {isLoading ? (
            <div className="flex items-center space-x-1 text-gray-500">
              <LuLoader className="animate-spin" size={16} />
              <span>로딩 중...</span>
            </div>
          ) : isSaving ? (
            <div
              className="flex items-center space-x-1"
              style={{ color: "var(--color-primary-medium)" }}
            >
              <LuLoader className="animate-spin" size={16} />
              <span>저장 중...</span>
            </div>
          ) : user ? (
            <div
              className="flex items-center space-x-1"
              style={{ color: "var(--color-success)" }}
            >
              <LuCloud size={16} />
              <span>클라우드 저장됨</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-gray-500">
              <LuHardDrive size={16} />
              <span>로컬 저장됨</span>
            </div>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      {!user && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--color-bg-warning)",
            color: "var(--color-text-warning-dark)",
          }}
        >
          💡 로그인하시면 테마 설정이 클라우드에 저장되어 다른 기기에서도 동일한
          테마를 사용할 수 있습니다.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(themes).map(([themeKey, theme]) => (
          <div
            key={themeKey}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              currentTheme === themeKey
                ? "ring-2 ring-offset-2 transform scale-105"
                : "hover:shadow-md"
            } ${isLoading || isSaving ? "opacity-50 pointer-events-none" : ""}`}
            style={{
              backgroundColor: theme.colors.background.card,
              borderColor:
                currentTheme === themeKey
                  ? theme.colors.border.focus
                  : theme.colors.border.light,
            }}
            onClick={() => !isLoading && !isSaving && setTheme(themeKey)}
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
                <LuCheck
                  className="mr-2"
                  size={16}
                  style={{ color: theme.colors.primary.medium }}
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

      {/* 추가 정보 */}
      <div className="text-xs text-gray-500 mt-4">
        <p>• 테마를 선택하면 자동으로 저장됩니다.</p>
        {user && (
          <p>
            • 설정은 클라우드에 저장되어 다른 기기에서도 동일하게 적용됩니다.
          </p>
        )}
        {!user && <p>• 로그인하지 않은 상태에서는 브라우저에만 저장됩니다.</p>}
      </div>
    </div>
  );
};

export default ThemeManager;
