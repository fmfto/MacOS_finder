import type { Metadata } from "next";
import "./globals.css"; 
// 👆 만약 여기서 빨간줄이 떠도, 실행에 문제 없다면 무시하세요. 
// 서버 재시작 후 next-env.d.ts가 갱신되면 사라집니다.

export const metadata: Metadata = {
  title: "FM Drive",
  description: "Personal NAS Cloud Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 여기에 suppressHydrationWarning 추가
    <html lang="ko" className="h-full antialiased overflow-hidden" suppressHydrationWarning>
      <body className="h-full w-full bg-finder-bg text-finder-text-primary select-none cursor-default">
        {children}
      </body>
    </html>
  );
}