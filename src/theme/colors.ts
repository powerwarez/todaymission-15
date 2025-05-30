// 테마 색상 관리 파일
// 여기서 색상을 변경하면 전체 앱의 테마가 변경됩니다.

export interface ColorTheme {
  name: string;
  displayName: string;
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

export const themes: Record<string, ColorTheme> = {
  // 여름 하늘 테마 (기본)
  summerSky: {
    name: "summerSky",
    displayName: "여름 하늘",
    description: "시원한 파스텔 파란색과 하늘색",
    colors: {
      primary: {
        light: "#e0f2fe",
        DEFAULT: "#7dd3fc",
        medium: "#38bdf8",
        dark: "#0284c7",
      },
      secondary: "#a5b4fc",
      accent: "#fb923c",
      background: {
        main: "#f0f9ff",
        card: "#ffffff",
        hover: "#e0f2fe",
      },
      text: {
        primary: "#0c4a6e",
        secondary: "#0369a1",
        muted: "#0ea5e9",
      },
      border: {
        light: "#bae6fd",
        DEFAULT: "#7dd3fc",
        focus: "#0284c7",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },

  // 핑크 파스텔 테마
  pinkPastel: {
    name: "pinkPastel",
    displayName: "핑크 파스텔",
    description: "부드러운 핑크색 계열",
    colors: {
      primary: {
        light: "#fce7f3",
        DEFAULT: "#f9a8d4",
        medium: "#f472b6",
        dark: "#be185d",
      },
      secondary: "#a78bfa",
      accent: "#a78bfa",
      background: {
        main: "#fdf2f8",
        card: "#ffffff",
        hover: "#fce7f3",
      },
      text: {
        primary: "#831843",
        secondary: "#be185d",
        muted: "#ec4899",
      },
      border: {
        light: "#fbcfe8",
        DEFAULT: "#f9a8d4",
        focus: "#be185d",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },

  // 노란색 계열 테마 (글씨는 주황색)
  sunnyYellow: {
    name: "sunnyYellow",
    displayName: "햇살 노랑",
    description: "밝은 노란색과 따뜻한 주황색",
    colors: {
      primary: {
        light: "#fef3c7",
        DEFAULT: "#fbbf24",
        medium: "#f59e0b",
        dark: "#d97706",
      },
      secondary: "#fb923c",
      accent: "#f97316",
      background: {
        main: "#fffbeb",
        card: "#ffffff",
        hover: "#fef3c7",
      },
      text: {
        primary: "#c2410c",
        secondary: "#ea580c",
        muted: "#f97316",
      },
      border: {
        light: "#fed7aa",
        DEFAULT: "#fbbf24",
        focus: "#d97706",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },

  // 파스텔 녹색과 연두색 계열 테마
  springGreen: {
    name: "springGreen",
    displayName: "봄 새싹",
    description: "상쾌한 파스텔 녹색과 연두색",
    colors: {
      primary: {
        light: "#dcfce7",
        DEFAULT: "#86efac",
        medium: "#4ade80",
        dark: "#16a34a",
      },
      secondary: "#a7f3d0",
      accent: "#65a30d",
      background: {
        main: "#f0fdf4",
        card: "#ffffff",
        hover: "#dcfce7",
      },
      text: {
        primary: "#14532d",
        secondary: "#166534",
        muted: "#22c55e",
      },
      border: {
        light: "#bbf7d0",
        DEFAULT: "#86efac",
        focus: "#16a34a",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },

  // 빨간색과 연한 주황색 계열 테마
  warmSunset: {
    name: "warmSunset",
    displayName: "따뜻한 노을",
    description: "정열적인 빨간색과 부드러운 주황색",
    colors: {
      primary: {
        light: "#fed7d7",
        DEFAULT: "#fb7185",
        medium: "#f43f5e",
        dark: "#be123c",
      },
      secondary: "#fdba74",
      accent: "#ea580c",
      background: {
        main: "#fff5f5",
        card: "#ffffff",
        hover: "#fed7d7",
      },
      text: {
        primary: "#7f1d1d",
        secondary: "#991b1b",
        muted: "#dc2626",
      },
      border: {
        light: "#fecaca",
        DEFAULT: "#fb7185",
        focus: "#be123c",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },

  // 겨울 테마 (차가운 회색과 파란색)
  winterFrost: {
    name: "winterFrost",
    displayName: "겨울 서리",
    description: "차가운 회색과 은은한 파란색",
    colors: {
      primary: {
        light: "#e2e8f0",
        DEFAULT: "#94a3b8",
        medium: "#64748b",
        dark: "#334155",
      },
      secondary: "#cbd5e1",
      accent: "#7dd3fc",
      background: {
        main: "#f8fafc",
        card: "#ffffff",
        hover: "#e2e8f0",
      },
      text: {
        primary: "#1e293b",
        secondary: "#334155",
        muted: "#475569",
      },
      border: {
        light: "#cbd5e1",
        DEFAULT: "#94a3b8",
        focus: "#334155",
      },
      status: {
        success: "#34d399",
        warning: "#fbbf24",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },
};

export const defaultTheme = themes.summerSky;

// 테마 변경을 위한 헬퍼 함수들
export const getThemeColors = () => defaultTheme.colors;

export const getThemeColor = (path: string): string => {
  const keys = path.split(".");
  let value: unknown = defaultTheme.colors;

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
