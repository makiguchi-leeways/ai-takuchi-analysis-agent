import Link from "next/link";
import { ArrowRight, BarChart3, Database, FileText, Target } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { KpiCards } from "@/components/MarketReport";
import { analyzeMarket } from "@/lib/market/report";
import { getDataCatalogSummary } from "@/lib/market/catalogServer";

export default function HomePage() {
  const report = analyzeMarket();
  const catalogSummary = getDataCatalogSummary();

  return (
    <main>
      <AppHeader />
      <section className="page-hero">
        <div>
          <p className="eyebrow">House Builder Market Intelligence</p>
          <h1>攻めるべき市区町村を、仕入れ判断まで一気通貫で見る。</h1>
          <p className="lead">
            指定フォルダのデータ棚卸し、サンプル分析、4象限、ブルーオーシャンTOP3、土地仕入れ上限、賃貸 vs 分譲比較をMVPとして実装しています。
          </p>
          <div className="action-row">
            <Link className="primary-button" href="/analyze">
              <Target size={18} />
              分析を開始する
            </Link>
            <Link className="secondary-button" href="/reports/sample-aoba-report">
              <FileText size={18} />
              サンプルレポート
            </Link>
          </div>
        </div>
        <aside className="hero-panel">
          <span>現在のMVP状態</span>
          <strong>{catalogSummary.usableDataFiles}件の利用候補データ</strong>
          <p>実データの棚卸し結果とサンプル分析値を分離し、後から差し替えできる設計です。</p>
        </aside>
      </section>

      <section className="page-section">
        <KpiCards report={report} />
      </section>

      <section className="page-section three-column">
        <article className="workflow-card">
          <Database size={22} />
          <h2>1. データ棚卸し</h2>
          <p>{catalogSummary.totalFiles}ファイルを分類し、CSV/JSONのカラム、件数、キー候補をdata_catalog.jsonに整理。</p>
        </article>
        <article className="workflow-card">
          <BarChart3 size={22} />
          <h2>2. 市場分析</h2>
          <p>市区町村・町丁目ランキング、流動性と需給の4象限、ブルーオーシャンTOP3を表示。</p>
        </article>
        <article className="workflow-card">
          <FileText size={22} />
          <h2>3. 共有レポート</h2>
          <p>Appendix付き詳細レポートをWeb表示し、ブラウザ印刷とCSV/Excel互換出力に対応。</p>
        </article>
      </section>

      <section className="page-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Recent Reports</p>
            <h2>最近作成したレポート</h2>
          </div>
          <Link className="text-link" href="/reports">
            一覧
            <ArrowRight size={16} />
          </Link>
        </div>
        <Link className="report-list-item" href="/reports/sample-aoba-report">
          <span>{report.title}</span>
          <strong>{report.executiveSummary.primaryMunicipality}</strong>
          <small>{report.createdAt.slice(0, 10)}</small>
        </Link>
      </section>
    </main>
  );
}
