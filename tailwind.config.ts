import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // macOS 기본 폰트를 최우선으로 적용 (San Francisco)
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "San Francisco",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      colors: {
        // macOS Finder Semantic Colors
        finder: {
          bg: "#F5F5F5",           // 기본 윈도우 배경 (Light mode 기준)
          sidebar: "#F6F6F6E6",    // 사이드바 (약간의 투명도 고려)
          active: "#007AFF",       // 선택된 항목 (System Blue)
          "active-bg": "#E4EEFE",  // 선택된 항목의 배경 (연한 블루)
          border: "#D1D1D6",       // 구분선 (매우 연함)
          hover: "#F0F0F0",        // 마우스 호버 시
          text: {
            primary: "#1D1D1F",    // 기본 텍스트
            secondary: "#86868B",  // 메타데이터 텍스트 (날짜, 크기 등)
          }
        },
      },
      boxShadow: {
        // macOS 스타일의 윈도우 그림자 및 팝업 그림자
        'mac-window': '0 20px 68px rgba(0, 0, 0, 0.55)',
        'mac-menu': '0 4px 12px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
};
export default config;