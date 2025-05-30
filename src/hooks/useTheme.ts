import { useState, useEffect } from "react";
import {
  currentTheme,
  ColorTheme,
  summerTheme,
  pinkTheme,
} from "../theme/colors";

// 사용 가능한 테마 목록
export const availableThemes = {
  summer: summerTheme,
  pink: pinkTheme,
} as const;

export type ThemeKey = keyof typeof availableThemes;

// 테마 관리 훅
export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<ColorTheme>(currentTheme);

  // 테마 변경 함수
  const changeTheme = (themeKey: ThemeKey) => {
    const newTheme = availableThemes[themeKey];
    setActiveTheme(newTheme);

    // 로컬 스토리지에 테마 설정 저장
    localStorage.setItem("app-theme", themeKey);

    // CSS 변수 업데이트
    updateCSSVariables(newTheme);
  };

  // CSS 변수 업데이트 함수
  const updateCSSVariables = (theme: ColorTheme) => {
    const root = document.documentElement;

    // 주요 색상 변수 업데이트
    root.style.setProperty("--color-primary-light", theme.colors.primary.light);
    root.style.setProperty(
      "--color-primary-default",
      theme.colors.primary.DEFAULT
    );
    root.style.setProperty(
      "--color-primary-medium",
      theme.colors.primary.medium
    );
    root.style.setProperty("--color-primary-dark", theme.colors.primary.dark);

    // 배경색 변수
    root.style.setProperty("--color-bg-main", theme.colors.background.main);
    root.style.setProperty("--color-bg-card", theme.colors.background.card);
    root.style.setProperty("--color-bg-hover", theme.colors.background.hover);

    // 텍스트 색상 변수
    root.style.setProperty("--color-text-primary", theme.colors.text.primary);
    root.style.setProperty(
      "--color-text-secondary",
      theme.colors.text.secondary
    );
    root.style.setProperty("--color-text-muted", theme.colors.text.muted);

    // 테두리 색상 변수
    root.style.setProperty("--color-border-light", theme.colors.border.light);
    root.style.setProperty(
      "--color-border-default",
      theme.colors.border.DEFAULT
    );
    root.style.setProperty("--color-border-focus", theme.colors.border.focus);

    // 배경색 업데이트
    document.body.style.backgroundColor = theme.colors.background.main;
  };

  // 컴포넌트 마운트 시 저장된 테마 로드
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as ThemeKey;
    if (savedTheme && availableThemes[savedTheme]) {
      const theme = availableThemes[savedTheme];
      setActiveTheme(theme);
      updateCSSVariables(theme);
    } else {
      // 기본 테마 적용
      updateCSSVariables(currentTheme);
    }
  }, []);

  return {
    activeTheme,
    changeTheme,
    getThemeColors: () => activeTheme.colors,
    getThemeColor: (path: string) => {
      const keys = path.split(".");
      let value: unknown = activeTheme.colors;

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          console.warn(`테마 색상 경로를 찾을 수 없습니다: ${path}`);
          return "#000000";
        }
      }

      return typeof value === "string" ? value : "#000000";
    },
    availableThemes: Object.keys(availableThemes) as ThemeKey[],
  };
};
