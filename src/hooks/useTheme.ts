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
  const [isInitialized, setIsInitialized] = useState(false);

  // 앱 초기 로딩 시 테마 적용 (사용자 로그인 상태와 무관하게)
  useEffect(() => {
    const initializeTheme = () => {
      // 로컬 스토리지에서 테마 확인
      const savedTheme = localStorage.getItem("app-theme");
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
        updateCSSVariables(themes[savedTheme]);
      } else {
        // 저장된 테마가 없으면 기본 테마 적용
        setCurrentTheme("summerSky");
        updateCSSVariables(defaultTheme);
      }
      setIsInitialized(true);
    };

    // 즉시 테마 초기화
    initializeTheme();
  }, []);

  // 사용자 로그인 후 데이터베이스에서 테마 설정 로드
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user || !isInitialized) return;

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
          // 오류 발생 시 현재 로컬 테마 유지
        } else if (data?.theme_preference && themes[data.theme_preference]) {
          // 데이터베이스의 테마가 현재 테마와 다르면 업데이트
          if (data.theme_preference !== currentTheme) {
            setCurrentTheme(data.theme_preference);
            updateCSSVariables(themes[data.theme_preference]);
            // 로컬 스토리지도 동기화
            localStorage.setItem("app-theme", data.theme_preference);
          }
        }
      } catch (err) {
        console.error("테마 로드 중 예외 발생:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [user, isInitialized, currentTheme]);

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

    // 기본 색상
    root.style.setProperty("--color-primary-light", theme.colors.primary.light);
    root.style.setProperty(
      "--color-primary-medium",
      theme.colors.primary.medium
    );
    root.style.setProperty("--color-primary-dark", theme.colors.primary.dark);

    // 배경 색상
    root.style.setProperty("--color-bg-primary", theme.colors.background.main);
    root.style.setProperty("--color-bg-main", theme.colors.background.main);
    root.style.setProperty("--color-bg-secondary", theme.colors.secondary);
    root.style.setProperty("--color-bg-card", theme.colors.background.card);
    root.style.setProperty("--color-bg-hover", theme.colors.background.hover);

    // 텍스트 색상
    root.style.setProperty("--color-text-primary", theme.colors.text.primary);
    root.style.setProperty(
      "--color-text-secondary",
      theme.colors.text.secondary
    );
    root.style.setProperty("--color-text-muted", theme.colors.text.muted);

    // 테두리 색상
    root.style.setProperty(
      "--color-border-default",
      theme.colors.border.DEFAULT
    );
    root.style.setProperty("--color-border-focus", theme.colors.border.focus);

    // 상태 색상
    root.style.setProperty("--color-success", theme.colors.status.success);
    root.style.setProperty("--color-error", theme.colors.status.error);
    root.style.setProperty("--color-warning", theme.colors.status.warning);
    root.style.setProperty("--color-info", theme.colors.status.info);

    // 배경 상태 색상 (투명도 추가)
    root.style.setProperty(
      "--color-bg-success",
      theme.colors.status.success + "20"
    );
    root.style.setProperty(
      "--color-bg-error",
      theme.colors.status.error + "20"
    );
    root.style.setProperty(
      "--color-bg-warning",
      theme.colors.status.warning + "20"
    );
    root.style.setProperty("--color-bg-info", theme.colors.status.info + "20");

    // 텍스트 상태 색상
    root.style.setProperty("--color-text-success", theme.colors.status.success);
    root.style.setProperty("--color-text-error", theme.colors.status.error);
    root.style.setProperty("--color-text-warning", theme.colors.status.warning);
    root.style.setProperty("--color-text-info", theme.colors.status.info);

    // 테두리 상태 색상 (투명도 추가)
    root.style.setProperty(
      "--color-border-success",
      theme.colors.status.success + "80"
    );
    root.style.setProperty(
      "--color-border-error",
      theme.colors.status.error + "80"
    );
    root.style.setProperty(
      "--color-border-warning",
      theme.colors.status.warning + "80"
    );
    root.style.setProperty(
      "--color-border-info",
      theme.colors.status.info + "80"
    );

    // 보조 색상
    root.style.setProperty("--color-secondary", theme.colors.secondary);

    // 액센트 색상 (트로피 등에 사용)
    root.style.setProperty("--color-accent", theme.colors.accent);
  };

  // 테마 변경 함수
  const setTheme = async (themeKey: string) => {
    if (!themes[themeKey]) {
      console.error(`테마 '${themeKey}'를 찾을 수 없습니다.`);
      return;
    }

    setCurrentTheme(themeKey);
    updateCSSVariables(themes[themeKey]);

    // 데이터베이스에 저장
    await saveThemeToDatabase(themeKey);
  };

  return {
    currentTheme,
    setTheme,
    themes,
    isLoading,
    isSaving,
    isInitialized,
  };
};
