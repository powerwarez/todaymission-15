/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    borderRadius: {
      // 기본 Tailwind borderRadius 값을 유지하거나 덮어쓰기
      // none: '0px',
      // sm: '0.125rem',
      DEFAULT: '0.25rem',
      md: '0.375rem',
      lg: '0.75rem', // 커스텀 값 (기본 lg는 0.5rem)
      xl: '1rem',    // 커스텀 값 (기본 xl은 0.75rem)
      '2xl': '1.5rem',  // 커스텀 값 (기본 2xl은 1rem)
      '3xl': '2rem',    // 커스텀 값 (기본 3xl은 1.5rem)
      full: '9999px',
    },
    extend: {
      colors: {
        // 파스텔 핑크 테마
        primary: {
          light: '#fce7f3', // 아주 연한 핑크 (배경 등)
          DEFAULT: '#f9a8d4', // 기본 핑크 (버튼, 강조)
          medium: '#f472b6', // 조금 더 진한 핑크
          dark: '#ec4899',  // 진한 핑크 (텍스트, 아이콘)
        },
        secondary: '#a78bfa', // 보조 색상 (예: 파스텔 퍼플)
        accent: '#34d399',    // 강조 색상 (예: 파스텔 그린 - 완료 표시 등)
        // 필요에 따라 다른 색상 추가
        pink: {
          "200": "#fbcfe8",
          "500": "#ec4899",
        },
      },
      fontFamily: {
        // 귀여운 글꼴 (예시, 웹 폰트 필요 시 추가 설정)
        // 시스템 폰트 또는 Google Fonts 등을 사용할 수 있습니다.
        // 'sans'는 기본 Tailwind sans-serif 스택을 유지합니다.
        cute: ['Quicksand', 'Nunito', 'sans-serif'], // 예시: Quicksand, Nunito
        sans: ['Pretendard', 'system-ui', 'sans-serif'], // 기본 글꼴로 Pretendard 설정 (설치 필요)
      },
    },
  },
  plugins: [],
}

