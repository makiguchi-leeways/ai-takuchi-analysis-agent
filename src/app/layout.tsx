import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gate 宅地需給分析",
  description: "地図ベースの宅地需給分析ワークスペース"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
