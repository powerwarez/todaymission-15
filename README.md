# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```

# 오늘 미션 (Today Mission)

아이들을 위한 일일 미션 관리 앱입니다. 매일 수행할 미션을 설정하고, 완료 상태를 추적하며, 주간 배지를 획득할 수 있습니다.

## 주요 기능

- **일일 미션 관리**: 매일 수행할 미션을 설정하고 완료 상태를 추적
- **주간 배지 시스템**: 주간 미션 완료 시 배지 획득
- **카카오 로그인**: 간편한 소셜 로그인
- **테마 관리**: 계절에 맞는 색상 테마 변경 가능
- **반응형 디자인**: 모바일과 데스크톱 모두 지원

## 🎨 테마 시스템

### 현재 사용 가능한 테마

- **여름 하늘**: 파스텔톤 파란색과 하늘색 계열 (기본)
- **핑크 파스텔**: 기존 파스텔 핑크 테마

### 테마 변경 방법

1. 설정 페이지에서 "테마 설정" 섹션으로 이동
2. 원하는 테마를 선택하여 즉시 적용
3. 선택한 테마는 자동으로 저장됩니다

### 새로운 테마 추가하기

개발자를 위한 테마 추가 가이드:

1. **색상 팔레트 정의** (`src/theme/colors.ts`)

```typescript
export const newTheme: ColorTheme = {
  name: "새 테마 이름",
  description: "테마 설명",
  colors: {
    primary: {
      light: "#색상코드",
      DEFAULT: "#색상코드",
      medium: "#색상코드",
      dark: "#색상코드",
    },
    // ... 기타 색상 정의
  },
};
```

2. **테마 목록에 추가** (`src/hooks/useTheme.ts`)

```typescript
export const availableThemes = {
  summer: summerTheme,
  pink: pinkTheme,
  newTheme: newTheme, // 새 테마 추가
} as const;
```

3. **Tailwind 설정 업데이트** (`tailwind.config.js`)

- 필요한 경우 새로운 색상 클래스 추가

4. **테마 관리자 UI 업데이트** (`src/components/ThemeManager.tsx`)

- 새 테마의 아이콘과 미리보기 색상 추가

## 기술 스택

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (인증, 데이터베이스)
- **빌드 도구**: Vite
- **아이콘**: React Icons (Lucide)
- **상태 관리**: React Context API

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 환경 설정

`.env` 파일에 다음 환경 변수를 설정하세요:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
├── contexts/           # React Context (인증 등)
├── hooks/              # 커스텀 훅
├── layouts/            # 레이아웃 컴포넌트
├── lib/                # 라이브러리 설정 (Supabase 등)
├── pages/              # 페이지 컴포넌트
├── styles/             # CSS 파일
├── theme/              # 테마 관리 파일
├── types/              # TypeScript 타입 정의
└── assets/             # 정적 자산
```

## 라이선스

MIT License
