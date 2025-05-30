import { useState, useEffect } from "react";
import { themes, defaultTheme, type ColorTheme } from "../theme/colors";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-hot-toast";

export const useTheme = () => {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<string>("summerSky");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 사용자 테마 설정 로드
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) {
        // 로그인하지 않은 경우 로컬 스토리지에서 로드
        const savedTheme = localStorage.getItem("app-theme");
        if (savedTheme && themes[savedTheme]) {
          setCurrentTheme(savedTheme);
          updateCSSVariables(themes[savedTheme]);
        } else {
          updateCSSVariables(defaultTheme);
        }
        return;
      }

      setIsLoading(true);
      try {
        // 데이터베이스에서 사용자 테마 설정 로드
        const { data, error } = await supabase
          .from("user_info")
          .select("theme_preference")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("테마 설정 로드 중 오류:", error);
          // 오류 발생 시 로컬 스토리지 또는 기본 테마 사용
          const savedTheme = localStorage.getItem("app-theme");
          const themeToUse =
            savedTheme && themes[savedTheme] ? savedTheme : "summerSky";
          setCurrentTheme(themeToUse);
          updateCSSVariables(themes[themeToUse]);
        } else if (data?.theme_preference && themes[data.theme_preference]) {
          setCurrentTheme(data.theme_preference);
          updateCSSVariables(themes[data.theme_preference]);
          // 로컬 스토리지도 동기화
          localStorage.setItem("app-theme", data.theme_preference);
        } else {
          // 데이터베이스에 설정이 없으면 기본 테마 사용
          setCurrentTheme("summerSky");
          updateCSSVariables(defaultTheme);
        }
      } catch (err) {
        console.error("테마 로드 중 예외 발생:", err);
        updateCSSVariables(defaultTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [user]);

  // 테마를 데이터베이스에 저장하는 함수
  const saveThemeToDatabase = async (themeKey: string) => {
    if (!user) {
      // 로그인하지 않은 경우 로컬 스토리지에만 저장
      localStorage.setItem("app-theme", themeKey);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_info")
        .update({
          theme_preference: themeKey,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("테마 저장 중 오류:", error);
        toast.error("테마 설정 저장에 실패했습니다.");
        // 오류 발생 시에도 로컬 스토리지에는 저장
        localStorage.setItem("app-theme", themeKey);
      } else {
        localStorage.setItem("app-theme", themeKey);
        toast.success("테마 설정이 저장되었습니다.");
      }
    } catch (err) {
      console.error("테마 저장 중 예외 발생:", err);
      toast.error("테마 설정 저장에 실패했습니다.");
      localStorage.setItem("app-theme", themeKey);
    } finally {
      setIsSaving(false);
    }
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

    // 보조 색상 변수
    root.style.setProperty("--color-secondary", theme.colors.secondary);
    root.style.setProperty(
      "--color-secondary-light",
      theme.colors.secondary + "40"
    ); // 투명도 추가
    root.style.setProperty("--color-secondary-medium", theme.colors.secondary);
    root.style.setProperty(
      "--color-secondary-dark",
      theme.colors.secondary + "CC"
    ); // 더 진한 색
    root.style.setProperty("--color-accent", theme.colors.accent);

    // 배경색 변수
    root.style.setProperty("--color-bg-main", theme.colors.background.main);
    root.style.setProperty("--color-bg-card", theme.colors.background.card);
    root.style.setProperty("--color-bg-hover", theme.colors.background.hover);

    // 상태별 배경색
    root.style.setProperty(
      "--color-bg-success",
      theme.colors.status.success + "20"
    );
    root.style.setProperty(
      "--color-bg-warning",
      theme.colors.status.warning + "20"
    );
    root.style.setProperty(
      "--color-bg-warning-hover",
      theme.colors.status.warning + "30"
    );
    root.style.setProperty(
      "--color-bg-error",
      theme.colors.status.error + "20"
    );

    // 텍스트 색상 변수
    root.style.setProperty("--color-text-primary", theme.colors.text.primary);
    root.style.setProperty(
      "--color-text-secondary",
      theme.colors.text.secondary
    );
    root.style.setProperty("--color-text-muted", theme.colors.text.muted);

    // 상태별 텍스트 색상
    root.style.setProperty("--color-text-error", theme.colors.status.error);
    root.style.setProperty(
      "--color-text-error-dark",
      theme.colors.status.error + "DD"
    );
    root.style.setProperty("--color-text-warning", theme.colors.status.warning);
    root.style.setProperty(
      "--color-text-warning-dark",
      theme.colors.status.warning + "DD"
    );

    // 테두리 색상 변수
    root.style.setProperty("--color-border-light", theme.colors.border.light);
    root.style.setProperty(
      "--color-border-default",
      theme.colors.border.DEFAULT
    );
    root.style.setProperty("--color-border-focus", theme.colors.border.focus);

    // 상태별 테두리 색상
    root.style.setProperty(
      "--color-border-error",
      theme.colors.status.error + "80"
    );
    root.style.setProperty(
      "--color-border-warning",
      theme.colors.status.warning + "80"
    );

    // 상태 색상 변수
    root.style.setProperty("--color-success", theme.colors.status.success);
    root.style.setProperty(
      "--color-success-light",
      theme.colors.status.success + "20"
    );
    root.style.setProperty(
      "--color-success-dark",
      theme.colors.status.success + "DD"
    );
    root.style.setProperty("--color-warning", theme.colors.status.warning);
    root.style.setProperty(
      "--color-warning-light",
      theme.colors.status.warning + "20"
    );
    root.style.setProperty(
      "--color-warning-dark",
      theme.colors.status.warning + "DD"
    );
    root.style.setProperty("--color-error", theme.colors.status.error);
    root.style.setProperty(
      "--color-error-light",
      theme.colors.status.error + "20"
    );
    root.style.setProperty(
      "--color-error-dark",
      theme.colors.status.error + "DD"
    );
    root.style.setProperty("--color-info", theme.colors.status.info);
  };

  // 테마 변경 함수
  const setTheme = (themeKey: string) => {
    if (themes[themeKey]) {
      setCurrentTheme(themeKey);
      updateCSSVariables(themes[themeKey]);
      saveThemeToDatabase(themeKey);
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
    isLoading,
    isSaving,
  };
};
