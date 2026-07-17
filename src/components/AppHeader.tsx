import Link from "next/link";
import { BarChart3, Database, FileText, Settings, Target } from "lucide-react";

const nav = [
  { href: "/analyze", label: "分析", icon: Target },
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/reports", label: "レポート", icon: FileText },
  { href: "/data-sources", label: "データ", icon: Database },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppHeader() {
  return (
    <header className="topbar no-print">
      <Link className="brand" href="/">
        <span className="brand-mark">HM</span>
        <span>Market Scout</span>
      </Link>
      <nav>
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
