import Link from "next/link";
import { ArrowRight, FileText, MapPinned, Target, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BlueOceanTop3, KpiCards, MarketMap, QuadrantChart, RankingTable } from "@/components/MarketReport";
import { analyzeMarket } from "@/lib/market/report";

export default function DashboardPage() {
  const report = analyzeMarket();

  return (
    <main>
      <AppHeader />
      <section className="page-section dashboard-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{report.executiveSummary.primaryMunicipality} 市場分析ダッシュボード</h1>
          <p className="lead">MVPではサンプルデータを明示して使用し、実データ差し替えに備えて分析ロジックをUIから分離しています。</p>
        </div>
        <Link className="primary-button" href="/reports/sample-aoba-report">
          <FileText size={18} />
          詳細レポート
        </Link>
      </section>

      <section className="page-section">
        <KpiCards report={report} />
      </section>

      <section className="page-section dashboard-grid">
        <article className="panel">
          <div className="section-heading">
            <TrendingUp size={22} />
            <h2>攻めるべき市区町村ランキング</h2>
          </div>
          <RankingTable areas={report.rankings.municipalities} compact />
        </article>
        <article className="panel">
          <div className="section-heading">
            <MapPinned size={22} />
            <h2>流動性 × 需給バランス地図</h2>
          </div>
          <MarketMap areas={report.rankings.neighborhoods} />
        </article>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <Target size={22} />
          <h2>ブルーオーシャンTOP3</h2>
        </div>
        <BlueOceanTop3 areas={report.blueOceanTop3} />
      </section>

      <section className="page-section dashboard-grid">
        <article className="panel wide-panel">
          <h2>流動性 × 需給バランスの4象限</h2>
          <QuadrantChart areas={report.quadrant} />
        </article>
        <article className="panel">
          <h2>推奨アクション</h2>
          <ul className="action-list">
            {report.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <Link className="text-link" href="/reports/sample-aoba-report">
            Appendixで根拠を見る
            <ArrowRight size={16} />
          </Link>
        </article>
      </section>
    </main>
  );
}
