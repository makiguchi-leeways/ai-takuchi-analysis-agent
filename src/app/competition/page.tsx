"use client";

import Link from "next/link";
import { BarChart3, Building2, Calculator, Database, FileText, Newspaper, Plus, Settings, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateCompetitionKpi, type CompetitionFinancials, type CompetitionKpi } from "@/lib/market/competition";

type CompetitorConfig = {
  name: string;
  code: string;
  operatingMargin: number;
  focus: string;
  financials: CompetitionFinancials;
};

type Competitor = CompetitorConfig & { kpi: CompetitionKpi };

const monthEndFactors = [0.9, 0.95, 1, 1.05, 1.08, 1.02, 0.98, 0.94, 0.97, 1.03, 1.07, 1.01];

function monthEndSeries(base: number, digits = 0) {
  return monthEndFactors.map((factor) => {
    const value = base * factor;
    return digits === 0 ? Math.round(value) : Number(value.toFixed(digits));
  });
}

const competitorConfigs: CompetitorConfig[] = [
  { name: "サンプル住宅株式会社", code: "0001", operatingMargin: 8.2, focus: "横浜市・川崎市", financials: sampleFinancials(125, 52, 185, 43, 42) },
  { name: "サンプルビルダー株式会社", code: "0002", operatingMargin: 6.8, focus: "東京都西部", financials: sampleFinancials(118, 56, 170, 35, 48) },
  { name: "サンプルホームズ株式会社", code: "0003", operatingMargin: 9.1, focus: "神奈川県央", financials: sampleFinancials(135, 48, 195, 49, 39) },
  { name: "サンプル不動産株式会社", code: "0004", operatingMargin: 5.4, focus: "埼玉南部", financials: sampleFinancials(108, 57, 158, 29, 52) },
  { name: "サンプル工務店株式会社", code: "0005", operatingMargin: 7.6, focus: "千葉西部", financials: sampleFinancials(116, 51, 166, 38, 43) },
  { name: "サンプルハウジング株式会社", code: "0006", operatingMargin: 8.7, focus: "横浜市北部", financials: sampleFinancials(128, 49, 188, 46, 40) },
  { name: "サンプル建設株式会社", code: "0007", operatingMargin: 4.9, focus: "東京多摩地域", financials: sampleFinancials(101, 59, 150, 26, 56) },
  { name: "サンプル都市開発株式会社", code: "0008", operatingMargin: 6.1, focus: "川崎市北部", financials: sampleFinancials(112, 55, 174, 34, 50) },
  { name: "サンプル住建株式会社", code: "0009", operatingMargin: 7.9, focus: "相模原市", financials: sampleFinancials(123, 50, 181, 43, 42) },
  { name: "サンプルライフ株式会社", code: "0010", operatingMargin: 6.7, focus: "さいたま市", financials: sampleFinancials(115, 54, 169, 36, 47) }
];

const competitors: Competitor[] = competitorConfigs.map((item) => ({ ...item, kpi: calculateCompetitionKpi(item.financials) }));

const news = [
  { date: "2026/07/24", company: "サンプル住宅株式会社", category: "新規分譲", title: "横浜市青葉区で新規分譲プロジェクトを開始", source: "EDINET / 企業IR" },
  { date: "2026/07/18", company: "サンプルホームズ株式会社", category: "土地取得", title: "神奈川県央での仕入れ強化方針を発表", source: "企業IR" },
  { date: "2026/07/11", company: "サンプルビルダー株式会社", category: "決算", title: "第2四半期決算説明資料を公開", source: "EDINET" }
];

type OwnInput = {
  annualSalesUnits: number;
  averageMonthEndInventoryUnits: number;
  averageInventoryValueOkuYen: number;
  costOfSalesOkuYen: number;
  grossProfitOkuYen: number;
};

const initialOwnInput: OwnInput = {
  annualSalesUnits: 72,
  averageMonthEndInventoryUnits: 40,
  averageInventoryValueOkuYen: 18,
  costOfSalesOkuYen: 90,
  grossProfitOkuYen: 30
};

export default function CompetitionPage() {
  const [company, setCompany] = useState("");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [own, setOwn] = useState<OwnInput>(initialOwnInput);
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitors[0]);
  const ownKpi = useMemo(() => calculateCompetitionKpi({
    fiscalYear: "入力年度",
    netSalesOkuYen: own.costOfSalesOkuYen + own.grossProfitOkuYen,
    grossProfitOkuYen: own.grossProfitOkuYen,
    costOfSalesOkuYen: own.costOfSalesOkuYen,
    monthEndInventoryUnits: Array(12).fill(own.averageMonthEndInventoryUnits),
    monthEndInventoryValueOkuYen: Array(12).fill(own.averageInventoryValueOkuYen),
    annualSalesUnits: own.annualSalesUnits
  }), [own]);
  const average = useMemo(() => ({
    unitTurnover: averageKpi(competitors, "unitTurnover"),
    salesPeriodMonths: averageKpi(competitors, "salesPeriodMonths"),
    valueTurnover: averageKpi(competitors, "valueTurnover"),
    inventoryValue: averageKpi(competitors, "averageInventoryValueOkuYen"),
    sellThroughRate: averageKpi(competitors, "sellThroughRate")
  }), []);
  const filteredCompetitors = competitors.filter((item) => item.name.includes(company));

  function updateOwn(key: keyof OwnInput, value: number) {
    setOwn((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 }));
  }

  return <main className="business-screen">
    <header className="procurement-header no-print"><Link className="procurement-brand" href="/"><span className="procurement-brand-mark">HM</span><span>Market Scout</span></Link><nav className="procurement-nav"><Link className="active" href="/competition"><BarChart3 size={16} />競合分析</Link><Link href="/"><Target size={16} />仕入分析</Link><Link href="/bids"><Building2 size={16} />入札情報</Link></nav><div className="procurement-header-actions"><Link href="/settings"><Settings size={16} />設定</Link></div></header>
    <section className="business-page-heading"><div><span className="eyebrow">COMPETITIVE INTELLIGENCE</span><h1>競合分析</h1><p>上場工務店の財務諸表から、仕入れから販売までの回転を同じ式で比較します。</p></div><div className="data-mode-badge"><Database size={15} />開発用サンプルデータ</div></section>
    <section className="business-content">
      <div className="business-toolbar"><label>競合企業を検索<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="会社名" /></label><button className="secondary-button" onClick={() => setShowAddCompany((value) => !value)} type="button"><Plus size={16} />企業を追加</button></div>
      {showAddCompany ? <div className="add-company-note"><strong>企業マスタの追加</strong><span>証券コード・法人番号・原典URLを登録するフォームはEDINETアダプター接続時に有効化します。</span></div> : null}
      <div className="competition-kpi-grid">
        <KpiComparison label="戸数ベース在庫回転数" own={formatTimes(ownKpi.unitTurnover)} average={formatTimes(average.unitTurnover)} ownValue={ownKpi.unitTurnover ?? 0} averageValue={average.unitTurnover ?? 0} higherIsBetter />
        <KpiComparison label="販売期間" own={formatMonths(ownKpi.salesPeriodMonths)} average={formatMonths(average.salesPeriodMonths)} ownValue={ownKpi.salesPeriodMonths ?? 0} averageValue={average.salesPeriodMonths ?? 0} higherIsBetter={false} />
        <KpiComparison label="金額ベース在庫回転率" own={formatTimes(ownKpi.valueTurnover)} average={formatTimes(average.valueTurnover)} ownValue={ownKpi.valueTurnover ?? 0} averageValue={average.valueTurnover ?? 0} higherIsBetter />
      </div>
      <div className="business-two-column">
        <section className="business-panel"><div className="panel-heading"><div><TrendingUp size={17} /><h2>自社KPI入力</h2></div><span>比較対象：上位{competitors.length}社平均</span></div><div className="own-kpi-form own-kpi-form-wide"><NumberInput label="年間販売戸数（戸）" value={own.annualSalesUnits} onChange={(value) => updateOwn("annualSalesUnits", value)} /><NumberInput label="年間平均月末在庫戸数（戸）" value={own.averageMonthEndInventoryUnits} onChange={(value) => updateOwn("averageMonthEndInventoryUnits", value)} /><NumberInput label="平均月末在庫金額（億円）" value={own.averageInventoryValueOkuYen} onChange={(value) => updateOwn("averageInventoryValueOkuYen", value)} /><NumberInput label="売上原価（億円）" value={own.costOfSalesOkuYen} onChange={(value) => updateOwn("costOfSalesOkuYen", value)} /><NumberInput label="売上総利益（億円）" value={own.grossProfitOkuYen} onChange={(value) => updateOwn("grossProfitOkuYen", value)} /></div><p className="muted-note">回転数 = 年間販売戸数 ÷ 年間平均月末在庫戸数。販売期間 = 12 ÷ 回転数。売上高は売上原価＋売上総利益で表示します。</p></section>
        <section className="business-panel"><div className="panel-heading"><div><FileText size={17} /><h2>競合財務・重点地域</h2></div><span>原典リンクを保存</span></div><div className="competitor-list">{filteredCompetitors.map((item) => <button className={selectedCompetitor.code === item.code ? "selected" : ""} key={item.code} onClick={() => setSelectedCompetitor(item)} type="button"><span><strong>{item.name}</strong><small>証券コード {item.code} / 営業利益率 {item.operatingMargin}%</small></span><b>{item.focus}</b></button>)}</div><SelectedCompanyDetail competitor={selectedCompetitor} /></section>
      </div>
      <section className="business-panel formula-panel"><div className="panel-heading"><div><Calculator size={17} /><h2>在庫回転KPIの計算根拠</h2></div><span>財務諸表・決算説明資料から推定</span></div><div className="formula-grid"><Formula label="年間平均月末在庫戸数" value="12か月の月末在庫戸数合計 ÷ 12" note="期末在庫だけでなく、年間の滞留を平均化" /><Formula label="戸数ベース在庫回転数" value="年間販売戸数 ÷ 年間平均月末在庫戸数" note="仕入れた戸数が販売に回る速さ" /><Formula label="販売期間" value="12か月 ÷ 戸数ベース在庫回転数" note="平均的に在庫が販売されるまでの月数" /><Formula label="金額ベース在庫回転率" value="売上原価 ÷ 年間平均在庫金額" note="財務諸表だけでも比較できる回転指標" /></div><p className="muted-note">販売戸数が開示されない会社は、売上高 ÷ 平均販売価格で戸数を推定します。推定値には「推定」を付け、実績値と混同しない表示にします。</p></section>
      <section className="business-panel news-panel"><div className="panel-heading"><div><Newspaper size={17} /><h2>競合ニュース・プレス</h2></div><span>PR TIMES / Google News RSS接続枠</span></div><div className="news-list">{news.map((item) => <article key={`${item.date}-${item.title}`}><time>{item.date}</time><span className="news-category">{item.category}</span><div><strong>{item.title}</strong><small>{item.company} / {item.source}</small></div></article>)}</div></section>
    </section>
  </main>;
}

function sampleFinancials(annualSalesUnits: number, averageInventoryUnits: number, netSalesOkuYen: number, grossProfitOkuYen: number, averageInventoryValueOkuYen: number): CompetitionFinancials {
  return {
    fiscalYear: "2025年度",
    netSalesOkuYen,
    grossProfitOkuYen,
    annualSalesUnits,
    monthEndInventoryUnits: monthEndSeries(averageInventoryUnits),
    monthEndInventoryValueOkuYen: monthEndSeries(averageInventoryValueOkuYen, 1)
  };
}

function averageKpi(competitorList: Competitor[], key: keyof CompetitionKpi) {
  const values = competitorList.map((item) => item.kpi[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function formatTimes(value: number | null) {
  return value === null ? "データなし" : `${value.toFixed(1)}回`;
}

function formatMonths(value: number | null) {
  return value === null ? "データなし" : `${value.toFixed(1)}か月`;
}

function KpiComparison({ label, own, average, ownValue, averageValue, higherIsBetter = false }: { label: string; own: string; average: string; ownValue: number; averageValue: number; higherIsBetter?: boolean }) {
  const ownWins = higherIsBetter ? ownValue >= averageValue : ownValue <= averageValue;
  const ownWidth = Math.min(100, Math.max(8, (ownValue / Math.max(ownValue, averageValue, 1)) * 100));
  const averageWidth = Math.min(100, Math.max(8, (averageValue / Math.max(ownValue, averageValue, 1)) * 100));
  return <article className="comparison-card"><span>{label}</span><div className="comparison-values"><strong>{own}</strong><small>TOP10平均 {average}</small></div><div className="benchmark-bars"><i className={ownWins ? "win" : ""} style={{ width: `${ownWidth}%` }} /><i className="average" style={{ width: `${averageWidth}%` }} /></div><em>{ownWins ? "平均より優位" : "平均との差を確認"}</em></article>;
}

function SelectedCompanyDetail({ competitor }: { competitor: Competitor }) {
  const { kpi } = competitor;
  return <div className="selected-company-detail"><strong>{competitor.name}</strong><span>重点仕入地域</span><b>{competitor.focus}</b><div className="company-kpi-grid"><Metric label="年間販売戸数" value={`${kpi.annualSalesUnits?.toFixed(0) ?? "データなし"}戸${kpi.annualSalesUnitsEstimated ? "（推定）" : ""}`} /><Metric label="年間平均月末在庫" value={`${kpi.averageMonthEndInventoryUnits.toFixed(1)}戸`} /><Metric label="販売期間" value={formatMonths(kpi.salesPeriodMonths)} /><Metric label="在庫回転日数" value={kpi.inventoryDays ? `${kpi.inventoryDays.toFixed(0)}日` : "データなし"} /><Metric label="売上原価" value={`${kpi.costOfSalesOkuYen.toFixed(1)}億円`} /><Metric label="金額回転率" value={formatTimes(kpi.valueTurnover)} /></div><details className="month-end-details"><summary>12か月の月末在庫戸数を見る</summary><p>{competitor.financials.monthEndInventoryUnits.map((value, index) => `${index + 1}月 ${value}戸`).join(" / ")}</p></details><small>原典：EDINET・企業IR。実データ接続後は有価証券報告書の年度・項目・原典URLを保持します。</small></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><b>{value}</b></div>;
}

function Formula({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="formula-item"><strong>{label}</strong><b>{value}</b><small>{note}</small></div>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
