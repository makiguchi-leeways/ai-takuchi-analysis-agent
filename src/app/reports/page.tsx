import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { analyzeMarket } from "@/lib/market/report";
import { manYen } from "@/lib/market/format";

export default function ReportsPage() {
  const report = analyzeMarket();

  return (
    <main>
      <AppHeader />
      <section className="page-section">
        <div className="section-heading">
          <FileText size={22} />
          <div>
            <p className="eyebrow">Reports</p>
            <h1>レポート一覧</h1>
          </div>
        </div>
        <Link className="report-card-row" href="/reports/sample-aoba-report">
          <div>
            <h2>{report.title}</h2>
            <p>{report.executiveSummary.decisionComments[0]}</p>
          </div>
          <div>
            <span>土地仕入れ上限</span>
            <strong>{manYen(report.executiveSummary.landAcquisitionLimitManYen)}</strong>
          </div>
          <ArrowRight size={20} />
        </Link>
      </section>
    </main>
  );
}
