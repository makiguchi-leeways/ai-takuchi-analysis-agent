"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Building2, CalendarDays, Download, FileText, MapPinned, Search, Settings, Target } from "lucide-react";
import { useState } from "react";

const bidItems = [
  { id: "bid-001", title: "市有地売却 一般競争入札", municipality: "横浜市", address: "青葉区あざみ野", type: "土地", area: "1,248㎡", price: "38,000万円", published: "2026/07/28", deadline: "2026/08/28", status: "受付中" },
  { id: "bid-002", title: "旧公共施設跡地の貸付公募", municipality: "川崎市", address: "宮前区鷺沼", type: "公有地", area: "820㎡", price: "最低価格 非公開", published: "2026/07/22", deadline: "2026/08/19", status: "受付中" },
  { id: "bid-003", title: "市有地売却 入札公告", municipality: "横浜市", address: "都筑区中川", type: "土地", area: "512㎡", price: "15,800万円", published: "2026/07/16", deadline: "2026/08/12", status: "締切間近" },
  { id: "bid-004", title: "公共施設用地の活用事業者募集", municipality: "相模原市", address: "南区相模大野", type: "建物", area: "2,040㎡", price: "提案募集", published: "2026/07/10", deadline: "2026/09/03", status: "受付中" }
];

export default function BidsPage() {
  const [keyword, setKeyword] = useState("");
  const [municipality, setMunicipality] = useState("すべて");
  const [type, setType] = useState("すべて");
  const [selected, setSelected] = useState(bidItems[0]);
  const [saved, setSaved] = useState(false);
  const municipalities = ["すべて", ...new Set(bidItems.map((item) => item.municipality))];
  const filtered = bidItems.filter((item) => (municipality === "すべて" || item.municipality === municipality) && (type === "すべて" || item.type === type) && `${item.title} ${item.address}`.includes(keyword));

  return <main className="business-screen"><header className="procurement-header no-print"><Link className="procurement-brand" href="/"><span className="procurement-brand-mark">HM</span><span>Market Scout</span></Link><nav className="procurement-nav"><Link href="/competition"><BarChart3 size={16} />競合分析</Link><Link href="/"><Target size={16} />仕入分析</Link><Link className="active" href="/bids"><Building2 size={16} />入札情報</Link></nav><div className="procurement-header-actions"><Link href="/settings"><Settings size={16} />設定</Link></div></header>
    <section className="business-page-heading"><div><span className="eyebrow">PUBLIC LAND OPPORTUNITIES</span><h1>入札情報</h1><p>自治体の不動産案件を検索し、仕入分析の候補として確認します。</p></div><div className="data-mode-badge"><FileText size={15} />公開情報・開発用サンプル</div></section>
    <section className="business-content bids-content"><div className="bid-search-panel"><label><span>キーワード</span><div className="input-with-icon"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="案件名・所在地" /></div></label><label><span>市区町村</span><select value={municipality} onChange={(event) => setMunicipality(event.target.value)}>{municipalities.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>不動産種別</span><select value={type} onChange={(event) => setType(event.target.value)}><option>すべて</option><option>土地</option><option>建物</option><option>公有地</option></select></label><button className="secondary-button" type="button"><Search size={16} />検索</button></div><div className="bids-layout"><section className="business-panel bid-list-panel"><div className="panel-heading"><div><Building2 size={17} /><h2>案件一覧</h2></div><div className="list-actions"><span>{filtered.length}件</span><button title="CSV出力" type="button" onClick={() => downloadCsv(filtered)}><Download size={15} /></button></div></div>{filtered.map((item) => <button className={`bid-list-item${selected.id === item.id ? " selected" : ""}`} key={item.id} onClick={() => setSelected(item)} type="button"><span className="bid-status">{item.status}</span><div><strong>{item.title}</strong><small>{item.municipality} {item.address} / {item.type} / {item.area}</small></div><b>{item.deadline}</b></button>)}</section><aside className="business-panel bid-detail-panel"><div className="panel-heading"><div><FileText size={17} /><h2>案件詳細</h2></div><span>{selected.status}</span></div><h3>{selected.title}</h3><dl className="bid-detail-list"><div><dt>公告主体</dt><dd>{selected.municipality}</dd></div><div><dt>所在地</dt><dd>{selected.address}</dd></div><div><dt>不動産種別</dt><dd>{selected.type}</dd></div><div><dt>面積</dt><dd>{selected.area}</dd></div><div><dt>予定価格・最低価格</dt><dd>{selected.price}</dd></div><div><dt>公告日 / 締切日</dt><dd>{selected.published} / {selected.deadline}</dd></div></dl><div className="bid-detail-actions"><Link className="primary-button" href={`/?municipality=${encodeURIComponent(selected.municipality === "横浜市" ? "横浜市青葉区" : selected.municipality)}&address=${encodeURIComponent(selected.address.includes("あざみ野") ? "あざみ野2丁目" : selected.address)}`}><MapPinned size={16} />仕入分析で見る</Link><button className="secondary-button" onClick={() => setSaved((value) => !value)} type="button"><CalendarDays size={16} />{saved ? "保存済み" : "保存"}</button></div><p className="muted-note">原文URL、添付資料、入札方式はNJSS等の正式データ接続後に案件単位で表示します。</p><a className="text-link" href="#source">原典情報を確認 <ArrowRight size={15} /></a></aside></div></section>
  </main>;
}

function downloadCsv(items: typeof bidItems) {
  const header = "案件名,自治体,所在地,種別,面積,最低価格,公告日,締切,ステータス";
  const rows = items.map((item) => [item.title, item.municipality, item.address, item.type, item.area, item.price, item.published, item.deadline, item.status].map((value) => `"${value.replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([`${header}\n${rows.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "market-scout-bids.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
