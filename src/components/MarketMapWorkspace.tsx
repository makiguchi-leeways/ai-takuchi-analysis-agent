"use client";

import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  Database,
  FileText,
  Layers,
  MapPinned,
  Newspaper,
  Printer,
  Search,
  Settings,
  ShieldAlert,
  Target,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import { OpenDataMarketMap } from "@/components/OpenDataMarketMap";
import { manYen, score } from "@/lib/market/format";
import type { AnalysisUnit, MarketReport, ProductType, RankedArea } from "@/lib/market/types";

type SearchForm = {
  prefecture: string;
  municipality: string;
  neighborhood: string;
  analysisUnit: AnalysisUnit;
  productType: ProductType;
  budgetManYen: string;
};

const layerSources = [
  {
    name: "Gate API",
    status: "接続中",
    tone: "active",
    layers: ["人口密度", "世帯年収", "賃料平均", "地価公示", "小学校区", "用途地域"]
  },
  {
    name: "不動産情報ライブラリAPI",
    status: "追加",
    tone: "planned",
    layers: ["取引価格", "地価公示", "都市計画", "不動産ID"]
  },
  {
    name: "土地情報・ハザード",
    status: "追加",
    tone: "planned",
    layers: ["洪水浸水", "土砂災害", "津波", "地形分類"]
  },
  {
    name: "RESAS / e-Stat",
    status: "追加",
    tone: "planned",
    layers: ["人口", "世帯", "所得", "将来推計"]
  }
];

const phaseTwoMenus = [
  { title: "回転率・在庫・売れ行きKPI", source: "販売・在庫データ", icon: Activity },
  { title: "競合決算（上場企業）", source: "EDINET API", icon: FileText },
  { title: "競合ニュース・プレス", source: "PR TIMES / Google News RSS", icon: Newspaper },
  { title: "入札情報サービス", source: "NJSS", icon: WalletCards }
];

const workspaceTabs = ["基本情報", "周辺相場", "建築未来図", "ハザードマップ", "統計情報", "周辺施設"];

export function MarketMapWorkspace({ report }: { report: MarketReport }) {
  const municipalityOptions = useMemo(() => unique(report.rankings.neighborhoods.map((item) => item.area.municipality)), [report]);
  const [form, setForm] = useState<SearchForm>({
    prefecture: report.input.prefecture,
    municipality: report.input.municipality,
    neighborhood: report.input.neighborhood,
    analysisUnit: report.input.analysisUnit,
    productType: report.input.productType,
    budgetManYen: String(report.marketGap.recommendedPriceManYen)
  });
  const [query, setQuery] = useState<SearchForm>(form);
  const [searchedAt, setSearchedAt] = useState("初期表示");

  const targetNeighborhoodOptions = useMemo(
    () =>
      unique(
        report.rankings.neighborhoods
          .filter((item) => item.area.municipality === form.municipality)
          .map((item) => item.area.neighborhood)
      ),
    [form.municipality, report]
  );

  const mapAreas = useMemo(() => resolveAreas(report.rankings.neighborhoods, query), [query, report]);
  const primaryArea = mapAreas[0] ?? report.rankings.neighborhoods[0];
  const blueOceanCount = mapAreas.filter((item) => item.quadrant === "blue-ocean").length;

  function updateForm<K extends keyof SearchForm>(key: K, value: SearchForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "municipality") {
        const nextNeighborhoods = report.rankings.neighborhoods
          .filter((item) => item.area.municipality === value)
          .map((item) => item.area.neighborhood);
        next.neighborhood = nextNeighborhoods[0] ?? "";
      }
      return next;
    });
  }

  function handleSearch() {
    setQuery(form);
    setSearchedAt(new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <main className="map-workspace-shell">
      <header className="topbar market-workspace-header no-print">
        <a className="brand" href="/">
          <span className="brand-mark">HM</span>
          <span>Market Scout</span>
        </a>
        <nav>
          <a href="/analyze">
            <Target size={17} />
            分析
          </a>
          <a href="/dashboard">
            <BarChart3 size={17} />
            ダッシュボード
          </a>
          <a href="/reports">
            <FileText size={17} />
            レポート
          </a>
          <a href="/data-sources">
            <Database size={17} />
            データ
          </a>
          <button onClick={handlePrint} type="button">
            <Printer size={17} />
            出力
          </button>
          <a href="/settings">
            <Settings size={17} />
            設定
          </a>
        </nav>
      </header>

      <section className="map-search-header">
        <div className="target-copy">
          <span>分析対象エリア</span>
          <strong>{query.municipality}</strong>
          <strong>{query.neighborhood}</strong>
        </div>
        <div className="map-search-fields">
          <label>
            都道府県
            <input value={form.prefecture} onChange={(event) => updateForm("prefecture", event.target.value)} />
          </label>
          <label>
            市区町村
            <select value={form.municipality} onChange={(event) => updateForm("municipality", event.target.value)}>
              {municipalityOptions.map((municipality) => (
                <option key={municipality}>{municipality}</option>
              ))}
            </select>
          </label>
          <label>
            町丁目・駅勢圏
            <select value={form.neighborhood} onChange={(event) => updateForm("neighborhood", event.target.value)}>
              {targetNeighborhoodOptions.length > 0 ? (
                targetNeighborhoodOptions.map((neighborhood) => <option key={neighborhood}>{neighborhood}</option>)
              ) : (
                <option>{form.neighborhood}</option>
              )}
            </select>
          </label>
          <label>
            分析単位
            <select value={form.analysisUnit} onChange={(event) => updateForm("analysisUnit", event.target.value as AnalysisUnit)}>
              <option>市区町村</option>
              <option>町丁目</option>
              <option>駅勢圏</option>
              <option>任意半径商圏</option>
            </select>
          </label>
          <label>
            商品タイプ
            <select value={form.productType} onChange={(event) => updateForm("productType", event.target.value as ProductType)}>
              <option>分譲戸建</option>
              <option>建売住宅</option>
              <option>注文住宅</option>
              <option>土地販売</option>
              <option>中古戸建再生</option>
            </select>
          </label>
          <label>
            想定価格
            <input inputMode="numeric" value={form.budgetManYen} onChange={(event) => updateForm("budgetManYen", event.target.value)} />
          </label>
        </div>
        <button className="map-search-button" onClick={handleSearch} type="button">
          <Search size={18} />
          検索
        </button>
      </section>

      <nav className="map-workspace-tabs" aria-label="分析メニュー">
        {workspaceTabs.map((tab, index) => (
          <button className={index === 4 ? "active" : ""} key={tab} type="button">
            {tab}
          </button>
        ))}
        <button className="add-tab" type="button">＋</button>
      </nav>

      <div className="map-workspace-body">
        <aside className="map-side-panel">
          <section className="side-section demand-summary">
            <div className="side-title">
              <TrendingUp size={18} />
              <h2>需給結果</h2>
            </div>
            <div className="summary-score">
              <span>総合</span>
              <strong>{score(primaryArea.overallScore)}</strong>
              <small>{searchedAt} 更新</small>
            </div>
            <dl className="summary-metrics">
              <div>
                <dt>流動性</dt>
                <dd>{score(primaryArea.liquidityScore)}</dd>
              </div>
              <div>
                <dt>需要</dt>
                <dd>{score(primaryArea.demandScore)}</dd>
              </div>
              <div>
                <dt>供給不足</dt>
                <dd>{score(primaryArea.supplyShortageScore)}</dd>
              </div>
              <div>
                <dt>候補数</dt>
                <dd>{mapAreas.length}</dd>
              </div>
            </dl>
            <p>{primaryArea.area.neighborhood}を中心に、ブルーオーシャン候補が{blueOceanCount}件あります。</p>
          </section>

          <section className="side-section">
            <div className="side-title">
              <Layers size={18} />
              <h2>APIレイヤー</h2>
            </div>
            <div className="layer-source-list">
              {layerSources.map((source) => (
                <details open={source.name === "Gate API"} key={source.name}>
                  <summary>
                    <span>{source.name}</span>
                    <em className={source.tone}>{source.status}</em>
                  </summary>
                  <div className="source-layer-chips">
                    {source.layers.map((layer) => (
                      <span key={layer}>{layer}</span>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="side-section">
            <div className="side-title">
              <Database size={18} />
              <h2>2ndフェーズ</h2>
            </div>
            <div className="phase-menu-list">
              {phaseTwoMenus.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.title} type="button">
                    <Icon size={17} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.source}</small>
                    </span>
                    <ChevronDown size={16} />
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="map-stage">
          <div className="map-result-toolbar">
            <div>
              <span>Supply Demand Map</span>
              <strong>{query.municipality} {query.neighborhood}</strong>
            </div>
            <div className="map-result-kpis">
              <span>
                <BarChart3 size={15} />
                総合 {score(primaryArea.overallScore)}
              </span>
              <span>
                <Building2 size={15} />
                仕入上限 {manYen(report.landAcquisition.landAcquisitionLimitManYen)}
              </span>
              <span>
                <ShieldAlert size={15} />
                ハザード 追加予定
              </span>
              <span>
                <MapPinned size={15} />
                API {layerSources.length}系統
              </span>
            </div>
          </div>
          <div className="map-stage-canvas">
            <OpenDataMarketMap areas={mapAreas} />
          </div>
        </section>
      </div>
    </main>
  );
}

function resolveAreas(areas: RankedArea[], query: SearchForm) {
  const sameMunicipality = areas.filter((item) => item.area.municipality === query.municipality);
  const base = sameMunicipality.length > 0 ? sameMunicipality : areas;
  return [...base].sort((a, b) => {
    const aExact = a.area.neighborhood === query.neighborhood ? 1 : 0;
    const bExact = b.area.neighborhood === query.neighborhood ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return a.rank - b.rank;
  });
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
