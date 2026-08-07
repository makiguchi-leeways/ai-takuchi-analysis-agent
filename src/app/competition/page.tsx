"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, Database, FileText, Newspaper, Plus, Settings, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

const competitors = [
  { name: "サンプル住宅株式会社", code: "0001", turnover: 2.4, inventory: 13, sellThrough: 84, operatingMargin: 8.2, focus: "横浜市・川崎市" },
  { name: "サンプルビルダー株式会社", code: "0002", turnover: 2.1, inventory: 16, sellThrough: 79, operatingMargin: 6.8, focus: "東京都西部" },
  { name: "サンプルホームズ株式会社", code: "0003", turnover: 2.8, inventory: 10, sellThrough: 88, operatingMargin: 9.1, focus: "神奈川県央" },
  { name: "サンプル不動産株式会社", code: "0004", turnover: 1.9, inventory: 21, sellThrough: 71, operatingMargin: 5.4, focus: "埼玉南部" },
  { name: "サンプル工務店株式会社", code: "0005", turnover: 2.3, inventory: 14, sellThrough: 81, operatingMargin: 7.6, focus: "千葉西部" },
  { name: "サンプルハウジング株式会社", code: "0006", turnover: 2.6, inventory: 12, sellThrough: 86, operatingMargin: 8.7, focus: "横浜市北部" },
  { name: "サンプル建設株式会社", code: "0007", turnover: 1.7, inventory: 24, sellThrough: 68, operatingMargin: 4.9, focus: "東京多摩地域" },
  { name: "サンプル都市開発株式会社", code: "0008", turnover: 2.0, inventory: 19, sellThrough: 75, operatingMargin: 6.1, focus: "川崎市北部" },
  { name: "サンプル住建株式会社", code: "0009", turnover: 2.5, inventory: 15, sellThrough: 83, operatingMargin: 7.9, focus: "相模原市" },
  { name: "サンプルライフ株式会社", code: "0010", turnover: 2.2, inventory: 17, sellThrough: 78, operatingMargin: 6.7, focus: "さいたま市" }
];

const news = [
  { date: "2026/07/24", company: "サンプル住宅株式会社", category: "新規分譲", title: "横浜市青葉区で新規分譲プロジェクトを開始", source: "EDINET / 企業IR" },
  { date: "2026/07/18", company: "サンプルホームズ株式会社", category: "土地取得", title: "神奈川県央での仕入れ強化方針を発表", source: "企業IR" },
  { date: "2026/07/11", company: "サンプルビルダー株式会社", category: "決算", title: "第2四半期決算説明資料を公開", source: "EDINET" }
];

export default function CompetitionPage() {
  const [company, setCompany] = useState("");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [own, setOwn] = useState({ turnover: 1.8, inventory: 18, sellThrough: 72 });
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitors[0]);
  const average = useMemo(() => ({
    turnover: competitors.reduce((sum, item) => sum + item.turnover, 0) / competitors.length,
    inventory: competitors.reduce((sum, item) => sum + item.inventory, 0) / competitors.length,
    sellThrough: competitors.reduce((sum, item) => sum + item.sellThrough, 0) / competitors.length
  }), []);
  const filteredCompetitors = competitors.filter((item) => item.name.includes(company));

  return <main className="business-screen">
    <header className="procurement-header no-print"><Link className="procurement-brand" href="/"><span className="procurement-brand-mark">HM</span><span>Market Scout</span></Link><nav className="procurement-nav"><Link href="/"><Target size={16} />仕入分析</Link><Link className="active" href="/competition"><BarChart3 size={16} />競合分析</Link><Link href="/bids"><Building2 size={16} />入札情報</Link></nav><div className="procurement-header-actions"><Link href="/settings"><Settings size={16} />設定</Link></div></header>
    <section className="business-page-heading"><div><span className="eyebrow">COMPETITIVE INTELLIGENCE</span><h1>競合分析</h1><p>競合のKPI、決算、重点仕入地域を同じ視点で比較します。</p></div><div className="data-mode-badge"><Database size={15} />開発用サンプルデータ</div></section>
    <section className="business-content">
      <div className="business-toolbar"><label>競合企業を検索<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="会社名" /></label><button className="secondary-button" onClick={() => setShowAddCompany((value) => !value)} type="button"><Plus size={16} />企業を追加</button></div>
      {showAddCompany ? <div className="add-company-note"><strong>企業マスタの追加</strong><span>証券コード・法人番号・原典URLを登録するフォームはEDINETアダプター接続時に有効化します。</span></div> : null}
      <div className="competition-kpi-grid"><KpiComparison label="在庫回転率" own={`${own.turnover.toFixed(1)}回`} average={`${average.turnover.toFixed(1)}回`} ownValue={own.turnover} averageValue={average.turnover} higherIsBetter /><KpiComparison label="在庫" own={`${own.inventory}億円`} average={`${average.inventory.toFixed(1)}億円`} ownValue={own.inventory} averageValue={average.inventory} /><KpiComparison label="売れ行き指数" own={`${own.sellThrough}`} average={`${average.sellThrough.toFixed(0)}`} ownValue={own.sellThrough} averageValue={average.sellThrough} higherIsBetter /></div>
      <div className="business-two-column"><section className="business-panel"><div className="panel-heading"><div><TrendingUp size={17} /><h2>自社KPI入力</h2></div><span>比較対象：上位{competitors.length}社平均</span></div><div className="own-kpi-form"><NumberInput label="在庫回転率（回）" value={own.turnover} onChange={(value) => setOwn({ ...own, turnover: value })} /><NumberInput label="在庫（億円）" value={own.inventory} onChange={(value) => setOwn({ ...own, inventory: value })} /><NumberInput label="売れ行き指数" value={own.sellThrough} onChange={(value) => setOwn({ ...own, sellThrough: value })} /></div><p className="muted-note">売れ行き指数は外部販売データ未接続のため、現時点では算出不可の指標です。入力値は比較表示専用です。</p></section><section className="business-panel"><div className="panel-heading"><div><FileText size={17} /><h2>競合財務・重点地域</h2></div><span>原典リンクを保存</span></div><div className="competitor-list">{filteredCompetitors.map((item) => <button className={selectedCompetitor.code === item.code ? "selected" : ""} key={item.code} onClick={() => setSelectedCompetitor(item)} type="button"><span><strong>{item.name}</strong><small>証券コード {item.code} / 営業利益率 {item.operatingMargin}%</small></span><b>{item.focus}</b></button>)}</div><div className="selected-company-detail"><strong>{selectedCompetitor.name}</strong><span>重点仕入地域</span><b>{selectedCompetitor.focus}</b><small>原典：EDINET・企業IR。法人番号、販売戸数、地域別投資額は正式データ接続後に表示します。</small></div></section></div>
      <section className="business-panel news-panel"><div className="panel-heading"><div><Newspaper size={17} /><h2>競合ニュース・プレス</h2></div><span>PR TIMES / Google News RSS接続枠</span></div><div className="news-list">{news.map((item) => <article key={`${item.date}-${item.title}`}><time>{item.date}</time><span className="news-category">{item.category}</span><div><strong>{item.title}</strong><small>{item.company} / {item.source}</small></div></article>)}</div></section>
    </section>
  </main>;
}

function KpiComparison({ label, own, average, ownValue, averageValue, higherIsBetter = false }: { label: string; own: string; average: string; ownValue: number; averageValue: number; higherIsBetter?: boolean }) {
  const ownWins = higherIsBetter ? ownValue >= averageValue : ownValue <= averageValue;
  const ownWidth = Math.min(100, Math.max(8, (ownValue / Math.max(ownValue, averageValue, 1)) * 100));
  const averageWidth = Math.min(100, Math.max(8, (averageValue / Math.max(ownValue, averageValue, 1)) * 100));
  return <article className="comparison-card"><span>{label}</span><div className="comparison-values"><strong>{own}</strong><small>TOP10平均 {average}</small></div><div className="benchmark-bars"><i className={ownWins ? "win" : ""} style={{ width: `${ownWidth}%` }} /><i className="average" style={{ width: `${averageWidth}%` }} /></div><em>{ownWins ? "平均より優位" : "平均との差を確認"}</em></article>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="number-field"><span>{label}</span><input type="number" min="0" step="0.1" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
