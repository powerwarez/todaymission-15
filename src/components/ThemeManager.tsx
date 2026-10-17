import React from "react";
import { useTheme } from "../hooks/useTheme";
import { themes } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import {
  LuLoader,
  LuCheck,
  LuCloud,
  LuHardDrive,
  LuInfo,
} from "react-icons/lu";
import Card from "./ui/Card";

const ThemeManager: React.FC = () => {
  const { currentTheme, setTheme, isLoading, isSaving } = useTheme();
  const { user } = useAuth();

  const busy = isLoading || isSaving;

  return (
    <Card className="space-y-4">
      {/* 저장 상태 표시 */}
      <div className="flex items-center justify-end text-sm font-bold" aria-live="polite">
        {isLoading ? (
          <div className="flex items-center gap-1 ui-text-sub">
            <LuLoader className="animate-spin" size={16} />
            <span>로딩 중...</span>
          </div>
        ) : isSaving ? (
          <div className="flex items-center gap-1 ui-text-sub">
            <LuLoader className="animate-spin" size={16} />
            <span>저장 중...</span>
          </div>
        ) : user ? (
          <div
            className="flex items-center gap-1"
            style={{ color: "var(--color-success-dark)" }}
          >
            <LuCloud size={16} />
            <span>클라우드 저장됨</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 ui-text-sub">
            <LuHardDrive size={16} />
            <span>로컬 저장됨</span>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      {!user && (
        <div
          className="ui-card-soft flex items-start gap-2 text-sm font-semibold"
          style={{
            backgroundColor: "var(--color-warning-light)",
            color: "var(--color-warning-dark)",
          }}
        >
          <LuInfo className="flex-none mt-0.5" size={18} />
          <span>
            로그인하시면 테마 설정이 클라우드에 저장되어 다른 기기에서도 동일한
            테마를 사용할 수 있습니다.
          </span>
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label="컬러 테마"
      >
        {Object.entries(themes).map(([themeKey, theme]) => {
          const selected = currentTheme === themeKey;
          const ink = theme.colors.text.primary;
          return (
            <button
              key={themeKey}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => setTheme(themeKey)}
              className="text-left p-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.colors.background.card,
                color: ink,
                border: `var(--ui-bw) solid ${ink}`,
                borderRadius: "var(--ui-radius-lg)",
                boxShadow: selected ? `0 4px 0 ${ink}` : "none",
                transform: selected ? "translateY(-2px)" : undefined,
              }}
            >
              {/* 테마 미리보기 색상 팔레트 */}
              <div className="flex gap-2 mb-3" aria-hidden="true">
                {(
                  theme.previewColors ?? [
                    theme.colors.primary.light,
                    theme.colors.primary.DEFAULT,
                    theme.colors.primary.medium,
                    theme.colors.primary.dark,
                  ]
                ).map((color) => (
                  <span
                    key={color}
                    className="w-7 h-7 rounded-full"
                    style={{
                      backgroundColor: color,
                      border: `2px solid ${ink}`,
                    }}
                  />
                ))}
              </div>

              {/* 테마 정보 */}
              <div className="flex items-center justify-between gap-2">
                <h4
                  className="text-lg"
                  style={{ color: theme.colors.text.primary }}
                >
                  {theme.displayName}
                </h4>
                {selected && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: theme.colors.primary.dark,
                      color: "#fff",
                    }}
                  >
                    <LuCheck size={14} />
                    선택됨
                  </span>
                )}
              </div>
              <p
                className="text-sm font-medium mt-1"
                style={{ color: theme.colors.text.secondary }}
              >
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* 추가 정보 */}
      <div className="text-xs ui-text-sub font-medium">
        <p>• 테마를 선택하면 자동으로 저장됩니다.</p>
        {user && (
          <p>• 설정은 클라우드에 저장되어 다른 기기에서도 동일하게 적용됩니다.</p>
        )}
        {!user && <p>• 로그인하지 않은 상태에서는 브라우저에만 저장됩니다.</p>}
      </div>
    </Card>
  );
};

export default ThemeManager;
