import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ExportButtons } from "@/components/ExportButtons";
import { FullReport } from "@/components/MarketReport";
import { analyzeMarket } from "@/lib/market/report";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "sample-aoba-report") notFound();
  const report = analyzeMarket();

  return (
    <main>
      <AppHeader />
      <section className="print-header">
        <div>
          <p className="eyebrow">Printable Report</p>
          <h1>{report.title}</h1>
          <p className="lead">作成日: {report.createdAt.slice(0, 10)} / データ種別: サンプルデータ + 実データ棚卸し</p>
        </div>
        <ExportButtons reportId={report.id} />
      </section>
      <FullReport report={report} />
    </main>
  );
}
