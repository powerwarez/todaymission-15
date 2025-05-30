/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    borderRadius: {
      // 기본 Tailwind borderRadius 값을 유지하거나 덮어쓰기
      // none: '0px',
      // sm: '0.125rem',
      DEFAULT: "0.25rem",
      md: "0.375rem",
      lg: "0.75rem", // 커스텀 값 (기본 lg는 0.5rem)
      xl: "1rem", // 커스텀 값 (기본 xl은 0.75rem)
      "2xl": "1.5rem", // 커스텀 값 (기본 2xl은 1rem)
      "3xl": "2rem", // 커스텀 값 (기본 3xl은 1.5rem)
      full: "9999px",
    },
    extend: {
      colors: {
        // 여름 하늘 테마 - 파스텔톤 파란색과 하늘색 계열
        primary: {
          light: "#e0f2fe", // 아주 연한 하늘색 (배경 등)
          DEFAULT: "#7dd3fc", // 기본 하늘색 (버튼, 강조)
          medium: "#38bdf8", // 조금 더 진한 하늘색
          dark: "#0284c7", // 진한 파란색 (텍스트, 아이콘)
        },
        secondary: "#a5b4fc", // 보조 색상 (파스텔 라벤더)
        accent: "#34d399", // 강조 색상 (파스텔 그린 - 완료 표시 등)
        // 기존 pink 색상을 sky 색상으로 매핑 (기존 코드 호환성을 위해)
        pink: {
          50: "#f0f9ff", // sky-50
          100: "#e0f2fe", // sky-100
          200: "#bae6fd", // sky-200
          300: "#7dd3fc", // sky-300
          400: "#38bdf8", // sky-400
          500: "#0ea5e9", // sky-500
          600: "#0284c7", // sky-600
          700: "#0369a1", // sky-700
          800: "#075985", // sky-800
          900: "#0c4a6e", // sky-900
        },
      },
      fontFamily: {
        // 귀여운 글꼴 (예시, 웹 폰트 필요 시 추가 설정)
        // 시스템 폰트 또는 Google Fonts 등을 사용할 수 있습니다.
        // 'sans'는 기본 Tailwind sans-serif 스택을 유지합니다.
        cute: ["Quicksand", "Nunito", "sans-serif"], // 예시: Quicksand, Nunito
        sans: ["Pretendard", "system-ui", "sans-serif"], // 기본 글꼴로 Pretendard 설정 (설치 필요)
      },
    },
  },
  plugins: [],
};
