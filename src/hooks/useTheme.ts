import { useState, useEffect } from "react";
import { themes, defaultTheme, type ColorTheme } from "../theme/colors";

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>("summerSky");

  // 로컬 스토리지에서 테마 설정 로드
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme");
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
      updateCSSVariables(themes[savedTheme]);
    } else {
      updateCSSVariables(defaultTheme);
    }
  }, []);

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

    // 보조 색상 변수
    root.style.setProperty("--color-secondary", theme.colors.secondary);
    root.style.setProperty("--color-accent", theme.colors.accent);

    // 상태 색상 변수
    root.style.setProperty("--color-success", theme.colors.status.success);
    root.style.setProperty("--color-warning", theme.colors.status.warning);
    root.style.setProperty("--color-error", theme.colors.status.error);
    root.style.setProperty("--color-info", theme.colors.status.info);
  };

  // 테마 변경 함수
  const setTheme = (themeKey: string) => {
    if (themes[themeKey]) {
      setCurrentTheme(themeKey);
      updateCSSVariables(themes[themeKey]);
      localStorage.setItem("app-theme", themeKey);
    } else {
      console.warn(`테마를 찾을 수 없습니다: ${themeKey}`);
    }
  };

  // 현재 테마 객체 가져오기
  const getActiveTheme = (): ColorTheme => {
    return themes[currentTheme] || defaultTheme;
  };

  // 테마 색상 가져오기
  const getThemeColors = () => {
    return getActiveTheme().colors;
  };

  // 특정 색상 경로의 값 가져오기
  const getThemeColor = (path: string): string => {
    const keys = path.split(".");
    let value: unknown = getThemeColors();

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        console.warn(`테마 색상 경로를 찾을 수 없습니다: ${path}`);
        return "#000000";
      }
    }

    return typeof value === "string" ? value : "#000000";
  };

  return {
    currentTheme,
    setTheme,
    activeTheme: getActiveTheme(),
    getThemeColors,
    getThemeColor,
    availableThemes: Object.keys(themes),
  };
};
