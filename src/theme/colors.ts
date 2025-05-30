// 테마 색상 관리 파일
// 여기서 색상을 변경하면 전체 앱의 테마가 변경됩니다.

export interface ColorTheme {
  name: string;
  description: string;
  colors: {
    primary: {
      light: string;
      DEFAULT: string;
      medium: string;
      dark: string;
    };
    secondary: string;
    accent: string;
    background: {
      main: string;
      card: string;
      hover: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: {
      light: string;
      DEFAULT: string;
      focus: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}

// 여름 테마 - 파스텔톤 파란색과 하늘색 계열
export const summerTheme: ColorTheme = {
  name: "Summer Sky",
  description: "여름 하늘을 닮은 파스텔톤 파란색과 하늘색 테마",
  colors: {
    primary: {
      light: "#e0f2fe", // 아주 연한 하늘색 (배경 등)
      DEFAULT: "#7dd3fc", // 기본 하늘색 (버튼, 강조)
      medium: "#38bdf8", // 조금 더 진한 하늘색
      dark: "#0284c7", // 진한 파란색 (텍스트, 아이콘)
    },
    secondary: "#a5b4fc", // 보조 색상 (파스텔 라벤더)
    accent: "#34d399", // 강조 색상 (파스텔 그린 - 완료 표시 등)
    background: {
      main: "#f0f9ff", // 메인 배경색 (아주 연한 하늘색)
      card: "#ffffff", // 카드 배경색
      hover: "#e0f2fe", // 호버 배경색
    },
    text: {
      primary: "#0c4a6e", // 주요 텍스트 (진한 파란색)
      secondary: "#0369a1", // 보조 텍스트 (중간 파란색)
      muted: "#0ea5e9", // 연한 텍스트 (밝은 파란색)
    },
    border: {
      light: "#bae6fd", // 연한 테두리
      DEFAULT: "#7dd3fc", // 기본 테두리
      focus: "#0284c7", // 포커스 테두리
    },
    status: {
      success: "#34d399", // 성공 (그린)
      warning: "#fbbf24", // 경고 (옐로우)
      error: "#f87171", // 에러 (레드)
      info: "#60a5fa", // 정보 (블루)
    },
  },
};

// 기존 핑크 테마 (참고용)
export const pinkTheme: ColorTheme = {
  name: "Pink Pastel",
  description: "기존 파스텔 핑크 테마",
  colors: {
    primary: {
      light: "#fce7f3",
      DEFAULT: "#f9a8d4",
      medium: "#f472b6",
      dark: "#ec4899",
    },
    secondary: "#a78bfa",
    accent: "#34d399",
    background: {
      main: "#fdf2f8",
      card: "#ffffff",
      hover: "#fce7f3",
    },
    text: {
      primary: "#ec4899",
      secondary: "#f472b6",
      muted: "#f9a8d4",
    },
    border: {
      light: "#fbcfe8",
      DEFAULT: "#f9a8d4",
      focus: "#ec4899",
    },
    status: {
      success: "#34d399",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#60a5fa",
    },
  },
};

// 현재 활성 테마 (여기서 테마를 변경하세요!)
export const currentTheme = summerTheme;

// 테마 변경을 위한 헬퍼 함수들
export const getThemeColors = () => currentTheme.colors;

export const getThemeColor = (path: string): string => {
  const keys = path.split(".");
  let value: unknown = currentTheme.colors;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      console.warn(`테마 색상 경로를 찾을 수 없습니다: ${path}`);
      return "#000000"; // 기본값
    }
  }

  return typeof value === "string" ? value : "#000000";
};

// Tailwind CSS 클래스명 생성 헬퍼
export const getThemeClass = (
  type: "bg" | "text" | "border",
  colorPath: string
): string => {
  // 실제 색상값을 가져와서 Tailwind 클래스로 매핑
  // 이 함수는 런타임에서 동적으로 클래스를 생성하는 대신
  // 미리 정의된 클래스 매핑을 사용합니다.

  const colorMappings: Record<string, Record<string, string>> = {
    "primary.light": {
      bg: "bg-sky-50",
      text: "text-sky-50",
      border: "border-sky-200",
    },
    "primary.DEFAULT": {
      bg: "bg-sky-300",
      text: "text-sky-300",
      border: "border-sky-300",
    },
    "primary.medium": {
      bg: "bg-sky-400",
      text: "text-sky-400",
      border: "border-sky-400",
    },
    "primary.dark": {
      bg: "bg-sky-700",
      text: "text-sky-700",
      border: "border-sky-700",
    },
    "background.main": {
      bg: "bg-sky-50",
      text: "text-sky-50",
      border: "border-sky-50",
    },
    "background.hover": {
      bg: "bg-sky-100",
      text: "text-sky-100",
      border: "border-sky-100",
    },
    "text.primary": {
      bg: "bg-sky-900",
      text: "text-sky-900",
      border: "border-sky-900",
    },
    "text.secondary": {
      bg: "bg-sky-700",
      text: "text-sky-700",
      border: "border-sky-700",
    },
    "text.muted": {
      bg: "bg-sky-500",
      text: "text-sky-500",
      border: "border-sky-500",
    },
    "border.focus": {
      bg: "bg-sky-700",
      text: "text-sky-700",
      border: "border-sky-700",
    },
  };

  const mapping = colorMappings[colorPath];
  if (mapping && mapping[type]) {
    return mapping[type];
  }

  console.warn(`테마 클래스 매핑을 찾을 수 없습니다: ${type}.${colorPath}`);
  return "";
};
