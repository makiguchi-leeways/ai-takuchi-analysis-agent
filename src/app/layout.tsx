import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "攻める市区町村 市場分析MVP",
  description: "ハウスメーカー向け市場分析レポートWebアプリ"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
