"use client";

import Link from "next/link";
import {
  BarChart3,
  Bookmark,
  Building2,
  Calculator,
  ChevronDown,
  CircleHelp,
  Database,
  ExternalLink,
  FileOutput,
  Layers,
  MapPinned,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Target,
  TrendingUp,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { OpenDataMarketMap, type MapFeatureSelection } from "@/components/OpenDataMarketMap";
import { calculateProcurementCeiling } from "@/lib/market/finance";
import { manYen, opportunityLabel, opportunityTone, percent, score } from "@/lib/market/format";
import { OPEN_DATA_LAYERS } from "@/lib/market/openData";
import { getProductCostProfile } from "@/lib/market/productCost";
import { calculateLayerAdjustedOpportunityScore } from "@/lib/market/scoring";
import type { LandListing } from "@/lib/market/listings";
import type {
  AnalysisUnit,
  MarketReport,
  ProductType,
  ProcurementCeilingInput,
  RankedArea
} from "@/lib/market/types";

type SearchForm = {
  prefecture: string;
  municipality: string;
  address: string;
  station: string;
  placeName: string;
  analysisUnit: AnalysisUnit;
  productType: ProductType;
  minBudgetManYen: string;
  maxBudgetManYen: string;
};

type LayerCategory = {
  id: string;
  label: string;
  layers: LayerControl[];
};

type LayerControl = {
  id: string;
  label: string;
  color: string;
  source: string;
  mapLayerId?: string;
  description?: string;
};

type LayerStatus = "待機" | "読込中" | "読込済" | "プレビュー" | "エラー" | "データなし";
type ListingSearchStatus = "idle" | "loading" | "loaded" | "error";
type ListingSearchState = {
  areaId: string | null;
  status: ListingSearchStatus;
  listings: LandListing[];
  message: string | null;
  sourceMode: "preview" | "crawl" | "api" | null;
};

const PROCUREMENT_ANALYSIS_LAYER_IDS = [
  "demand-score",
  "supply-score",
  "supply-demand-gap",
  "procurement-opportunity",
  "candidate-top10"
];
const ANALYSIS_LAYER_IDS = new Set(PROCUREMENT_ANALYSIS_LAYER_IDS);

const LAYER_CATEGORIES: LayerCategory[] = [
  {
    id: "land",
    label: "不動産価格",
    layers: [
      { id: "land-price", label: "地価公示", color: "#a86b15", source: "Gate API", mapLayerId: "land-price" },
      { id: "rent-mean", label: "賃料平均", color: "#7c4d9f", source: "Gate API", mapLayerId: "rent-mean" },
      { id: "transaction-price", label: "不動産取引価格", color: "#2f7f9f", source: "不動産情報ライブラリAPI", mapLayerId: "transaction-price" },
      { id: "past-transactions", label: "過去取引・売出土地", color: "#688b84", source: "不動産情報ライブラリAPI", mapLayerId: "past-transactions" }
    ]
  },
  {
    id: "demographics",
    label: "人口・世帯",
    layers: [
      { id: "population-density", label: "人口・人口増減", color: "#12665d", source: "Gate API / e-Stat", mapLayerId: "population-density" },
      { id: "household-income", label: "世帯年収", color: "#245f9f", source: "Gate API / RESAS", mapLayerId: "household-income" },
      { id: "household-change", label: "世帯増減・年齢構成", color: "#4e7890", source: "Gate API / e-Stat", mapLayerId: "household-change" },
      { id: "future-population", label: "子育て世帯・将来人口", color: "#7c4d9f", source: "Gate API / e-Stat / RESAS", mapLayerId: "future-population" }
    ]
  },
  {
    id: "planning",
    label: "都市計画・建築",
    layers: [
      { id: "use-district", label: "用途地域", color: "#a93a34", source: "Gate API / 不動産情報ライブラリAPI", mapLayerId: "use-district" },
      { id: "building-regulation", label: "建蔽率・容積率", color: "#7d5e3e", source: "不動産情報ライブラリAPI", mapLayerId: "building-regulation" },
      { id: "development", label: "建築確認・開発情報", color: "#4e7890", source: "不動産情報ライブラリAPI", mapLayerId: "development" }
    ]
  },
  {
    id: "hazard",
    label: "ハザード",
    layers: [
      { id: "flood", label: "洪水・河川浸水", color: "#326aa8", source: "国土地理院・ハザードマップ" },
      { id: "landslide", label: "土砂災害", color: "#aa6331", source: "国土地理院・ハザードマップ" },
      { id: "earthquake", label: "液状化・地震発生確率", color: "#963f55", source: "ハザードマップ" }
    ]
  },
  {
    id: "mobility",
    label: "交通・生活",
    layers: [
      { id: "stations", label: "駅・バス停・道路", color: "#3f7381", source: "国土数値情報" },
      { id: "facilities", label: "スーパー・病院・公園", color: "#6c8040", source: "国土数値情報" },
      { id: "gross-rate", label: "キャップレート", color: "#5b6c2f", source: "Gate API", mapLayerId: "gross-rate" },
      { id: "transport", label: "鉄道路線・駅", color: "#475569", source: "OpenStreetMap / Overpass", mapLayerId: "transport" }
    ]
  },
  {
    id: "education",
    label: "教育",
    layers: [
      { id: "elementary-school", label: "小学校・小学校区", color: "#2f7f9f", source: "Gate API / 国土数値情報", mapLayerId: "elementary-school" },
      { id: "junior-high-school", label: "中学校・中学校区", color: "#6b5aa4", source: "国土数値情報" }
    ]
  },
  {
    id: "land-detail",
    label: "土地・社内情報",
    layers: [
      { id: "cadastral", label: "公図・地番・筆界", color: "#76665b", source: "国土交通省・筆ポリゴン" },
      { id: "measurement", label: "距離・面積・徒歩圏", color: "#3c7c73", source: "Market Scoutツール" },
      { id: "internal-notes", label: "メモ・注意地点", color: "#8b6f2f", source: "社内情報" }
    ]
  }
];

const DEFAULT_ENABLED_LAYER_IDS = new Set([
  "population-density",
  "land-price",
  "transport"
]);

export function MarketMapWorkspace({ report, initialSearch }: { report: MarketReport; initialSearch?: { municipality?: string; address?: string } }) {
  const municipalityOptions = useMemo(() => unique(report.rankings.neighborhoods.map((item) => item.area.municipality)), [report]);
  const prefectureOptions = useMemo(() => unique(report.rankings.neighborhoods.map((item) => item.area.prefecture)), [report]);
  const initialForm: SearchForm = {
    prefecture: report.input.prefecture,
    municipality: initialSearch?.municipality ?? report.input.municipality,
    address: initialSearch?.address ?? report.input.neighborhood,
    station: "",
    placeName: "",
    analysisUnit: report.input.analysisUnit,
    productType: report.input.productType,
    minBudgetManYen: "",
    maxBudgetManYen: String(report.marketGap.recommendedPriceManYen)
  };
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [query, setQuery] = useState<SearchForm>(initialForm);
  const [enabledLayerIds, setEnabledLayerIds] = useState<string[]>([...DEFAULT_ENABLED_LAYER_IDS]);
  const [layerStatuses, setLayerStatuses] = useState<Record<string, LayerStatus>>({});
  const [selectedArea, setSelectedArea] = useState<RankedArea | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureSelection | null>(null);
  const [listingSearch, setListingSearch] = useState<ListingSearchState>({ areaId: null, status: "idle", listings: [], message: null, sourceMode: null });
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchedAt, setSearchedAt] = useState("初期表示");

  const targetNeighborhoodOptions = useMemo(
    () => unique(report.rankings.neighborhoods.filter((item) => item.area.municipality === form.municipality).map((item) => item.area.neighborhood)),
    [form.municipality, report]
  );
  const mapAreas = useMemo(() => resolveAreas(report.rankings.neighborhoods, query), [query, report]);
  const primaryArea = selectedArea ?? mapAreas[0] ?? report.rankings.neighborhoods[0];
  const topTen = mapAreas.slice(0, 10);
  const candidateAreas = useMemo(() => {
    if (!selectedArea || topTen.some((item) => item.area.id === selectedArea.area.id)) return topTen;
    return [selectedArea, ...topTen].slice(0, 10);
  }, [selectedArea, topTen]);
  const scoreLayerIds = useMemo(
    () => [...PROCUREMENT_ANALYSIS_LAYER_IDS, ...enabledLayerIds.filter((id) => !ANALYSIS_LAYER_IDS.has(id))],
    [enabledLayerIds]
  );
  const adjustedOpportunity = useMemo(
    () => calculateLayerAdjustedOpportunityScore(primaryArea, scoreLayerIds),
    [primaryArea, scoreLayerIds]
  );
  const openDataLayerIds = useMemo(
    () => enabledLayerIds.filter((id) => OPEN_DATA_LAYERS.some((layer) => layer.id === id)),
    [enabledLayerIds]
  );
  const enabledCategories = useMemo(
    () => LAYER_CATEGORIES.map((category) => ({ ...category, activeCount: category.layers.filter((layer) => enabledLayerIds.includes(layer.id)).length })),
    [enabledLayerIds]
  );

  const simulatorDefaults: ProcurementCeilingInput = {
    expectedSalePriceManYen: report.marketGap.recommendedPriceManYen,
    buildingCostManYen: getProductCostProfile(report.input.productType).buildingCostApplicable
      ? report.input.expectedBuildingPriceManYen
      : 0,
    landDevelopmentCostManYen: 180,
    exteriorCostManYen: 220,
    demolitionCostManYen: 0,
    brokerageCostManYen: 180,
    financeCostManYen: 120,
    salesAdminCostManYen: 280,
    taxesRegistrationCostManYen: 120,
    targetProfitManYen: 650,
    targetGrossMarginRate: report.input.targetGrossMarginRate,
    riskAdjustmentManYen: 150,
    landAreaTsubo: report.input.landAreaTsubo
  };
  const [simulator, setSimulator] = useState<ProcurementCeilingInput>(simulatorDefaults);
  const procurement = useMemo(() => calculateProcurementCeiling(simulator), [simulator]);
  const productCostProfile = useMemo(() => getProductCostProfile(form.productType), [form.productType]);

  function updateForm<K extends keyof SearchForm>(key: K, value: SearchForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "municipality") {
        const nextNeighborhood = report.rankings.neighborhoods.find((item) => item.area.municipality === value)?.area.neighborhood ?? "";
        next.address = nextNeighborhood;
      }
      return next;
    });
  }

  function handleProductTypeChange(productType: ProductType) {
    updateForm("productType", productType);
    const profile = getProductCostProfile(productType);
    setSimulator((current) => ({ ...current, buildingCostManYen: profile.buildingCostManYen }));
  }

  function handleSearch() {
    setQuery(form);
    setSelectedArea(null);
    setSelectedFeature(null);
    setListingSearch({ areaId: null, status: "idle", listings: [], message: null, sourceMode: null });
    setSelectedListingId(null);
    setSearchedAt(new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date()));
  }

  function toggleLayer(layerId: string) {
    setEnabledLayerIds((current) => current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]);
  }

  function handleAreaSelect(area: RankedArea) {
    setSelectedArea(area);
    setSelectedFeature(null);
    setListingSearch({ areaId: null, status: "idle", listings: [], message: null, sourceMode: null });
    setSelectedListingId(null);
    setSimulator((current) => ({
      ...current,
      expectedSalePriceManYen: area.area.averageSalePriceManYen
    }));
  }

  function handleFeatureSelect(feature: MapFeatureSelection) {
    setSelectedFeature(feature);
  }

  async function handleListingSearch(area: RankedArea) {
    setListingSearch({ areaId: area.area.id, status: "loading", listings: [], message: null, sourceMode: null });
    setSelectedListingId(null);
    const params = new URLSearchParams({
      prefecture: area.area.prefecture,
      municipality: area.area.municipality,
      neighborhood: area.area.neighborhood,
      productType: form.productType
    });

    try {
      const response = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as { listings?: LandListing[]; message?: string; sourceMode?: ListingSearchState["sourceMode"]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "売出情報の取得に失敗しました。");
      setListingSearch({
        areaId: area.area.id,
        status: "loaded",
        listings: payload.listings ?? [],
        message: payload.message ?? null,
        sourceMode: payload.sourceMode ?? "preview"
      });
    } catch (error) {
      setListingSearch({
        areaId: area.area.id,
        status: "error",
        listings: [],
        message: error instanceof Error ? error.message : "売出情報の取得に失敗しました。",
        sourceMode: null
      });
    }
  }

  function handleListingSelect(listing: LandListing) {
    setSelectedListingId(listing.id);
  }

  function updateSimulator<K extends keyof ProcurementCeilingInput>(key: K, value: number) {
    setSimulator((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 }));
  }

  return (
    <main className="procurement-app">
      <header className="procurement-header no-print">
        <Link className="procurement-brand" href="/" aria-label="Market Scout 仕入分析">
          <span className="procurement-brand-mark">HM</span>
          <span>Market Scout</span>
        </Link>
        <nav className="procurement-nav" aria-label="主要メニュー">
          <Link href="/competition">
            <BarChart3 size={16} />競合分析
          </Link>
          <Link className="active" href="/">
            <Target size={16} />仕入分析
          </Link>
          <Link href="/bids">
            <Building2 size={16} />入札情報
          </Link>
        </nav>
        <div className="procurement-header-actions">
          <button className={saved ? "is-saved" : ""} onClick={() => setSaved((value) => !value)} type="button">
            <Bookmark size={16} />{saved ? "保存済み" : "保存案件"}
          </button>
          <button onClick={() => window.print()} type="button">
            <FileOutput size={16} />出力
          </button>
          <Link href="/settings"><Settings size={16} />設定</Link>
          <button className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} type="button" aria-label="メニュー">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {menuOpen ? <div className="mobile-menu-panel no-print"><Link href="/competition"><BarChart3 size={15} />競合分析</Link><Link href="/"><Target size={15} />仕入分析</Link><Link href="/bids"><Building2 size={15} />入札情報</Link><Link href="/settings"><Settings size={15} />設定</Link></div> : null}

      <section className="procurement-searchbar no-print">
        <div className="searchbar-title">
          <span>仕入分析</span>
          <strong>次に仕入れる土地を選ぶ</strong>
        </div>
        <label><span>都道府県</span><select value={form.prefecture} onChange={(event) => updateForm("prefecture", event.target.value)}>{prefectureOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>市区町村</span><select value={form.municipality} onChange={(event) => updateForm("municipality", event.target.value)}>{municipalityOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>町名・住所</span><input value={form.address} onChange={(event) => updateForm("address", event.target.value)} placeholder="例：美しが丘1丁目" /></label>
        <label><span>駅名</span><input value={form.station} onChange={(event) => updateForm("station", event.target.value)} placeholder="駅名で絞り込み" /></label>
        <label><span>対象商品</span><select value={form.productType} onChange={(event) => handleProductTypeChange(event.target.value as ProductType)}><option>分譲戸建</option><option>建売住宅</option><option>注文住宅</option><option>土地販売</option><option>中古戸建再生</option></select></label>
        <label><span>土地予算下限（万円）</span><input inputMode="numeric" value={form.minBudgetManYen} onChange={(event) => updateForm("minBudgetManYen", event.target.value)} /></label>
        <label><span>土地予算上限（万円）</span><input inputMode="numeric" value={form.maxBudgetManYen} onChange={(event) => updateForm("maxBudgetManYen", event.target.value)} /></label>
        <button className="procurement-search-button" onClick={handleSearch} type="button"><Search size={17} />検索</button>
      </section>

      <div className="procurement-layout">
        <aside className="procurement-sidebar no-print" aria-label="地図レイヤー操作">
          <div className="sidebar-heading">
            <div><Layers size={18} /><div><strong>レイヤー</strong><small>{enabledLayerIds.length}件を表示中</small></div></div>
            <span className="sidebar-help-icon" title="レイヤー操作の説明"><CircleHelp size={16} /></span>
          </div>
          <div className="layer-category-list">
            {enabledCategories.map((category) => (
              <details className="layer-category" key={category.id} open={category.id === "procurement" || category.activeCount > 0}>
                <summary><span>{category.label}</span><em>{category.activeCount > 0 ? `${category.activeCount} ON` : ""}</em><ChevronDown size={15} /></summary>
                <div className="layer-control-list">
                  {category.layers.map((layer) => {
                    const active = enabledLayerIds.includes(layer.id);
                    const status = layerStatuses[layer.mapLayerId ?? layer.id] ?? (ANALYSIS_LAYER_IDS.has(layer.id) ? "読込済" : "待機");
                    return (
                      <label className={`layer-control-row${active ? " active" : ""}`} key={layer.id}>
                        <input checked={active} onChange={() => toggleLayer(layer.id)} type="checkbox" />
                        <span className="layer-color-dot" style={{ backgroundColor: layer.color }} />
                        <span className="layer-control-copy"><strong>{layer.label}</strong><small>{layer.source}</small></span>
                        <span className={`layer-status layer-status-${status}`}>{status}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
          <SelectedAreaSummary area={primaryArea} adjustedOpportunity={adjustedOpportunity} selected={Boolean(selectedArea)} />
          <div className="sidebar-source-note"><Database size={14} /><span>外部APIはレイヤーON時に必要な範囲だけ取得します。取得値には出典・基準日を付けて表示します。</span></div>
        </aside>

        <section className="procurement-map-panel">
          <div className="map-panel-toolbar no-print">
            <div><span>分析対象</span><strong>{query.municipality} {query.address}</strong><small>{searchedAt} / {report.sourceMode === "sample" ? "開発用サンプルデータ" : "Production Data"}</small></div>
            <div className="map-toolbar-actions"><span className="map-legend"><i className="legend-dot legend-good" />有望 <i className="legend-dot legend-caution" />慎重 <i className="legend-dot legend-stop" />非推奨</span><strong className="map-selection-hint">右側に選択エリアの詳細を表示</strong></div>
          </div>
          <div className="procurement-map-canvas">
            <OpenDataMarketMap
              areas={mapAreas}
              enabledLayerIds={openDataLayerIds}
              selectedAreaId={primaryArea.area.id}
              onEnabledLayerIdsChange={(ids) => setEnabledLayerIds((current) => [...current.filter((id) => !OPEN_DATA_LAYERS.some((layer) => layer.id === id)), ...ids])}
              onFeatureSelect={handleFeatureSelect}
              onAreaSelect={handleAreaSelect}
              onLayerStatusChange={setLayerStatuses}
            />
          </div>
        </section>

        <aside className="procurement-drawer" aria-label="選択エリア詳細">
            <div className="drawer-header"><div><span>{selectedFeature ? "地図データ詳細" : "仕入れ候補・仕入れ分析"}</span><h2>{selectedFeature?.title ?? primaryArea.area.neighborhood}</h2><small>{primaryArea.area.municipality} / {primaryArea.area.analysisUnit}</small></div></div>
            {selectedFeature ? <FeatureDetail feature={selectedFeature} /> : <><CandidateOverview areas={candidateAreas} scoreLayerIds={scoreLayerIds} selectedArea={primaryArea} onAreaSelect={handleAreaSelect} /><AreaDetail area={primaryArea} report={report} adjustedOpportunity={adjustedOpportunity} listingSearch={listingSearch} selectedListingId={selectedListingId} onSearchListings={handleListingSearch} onSelectListing={handleListingSelect} /></>}
            <section className="drawer-section simulator-section">
              <div className="drawer-section-heading"><Calculator size={16} /><h3>仕入シミュレーション</h3></div>
              <div className="simulator-grid">
                <NumberField label="想定総売上" value={simulator.expectedSalePriceManYen} onChange={(value) => updateSimulator("expectedSalePriceManYen", value)} />
                <NumberField label={productCostProfile.buildingCostApplicable ? "建築原価（万円）" : "建築原価（対象外）"} value={simulator.buildingCostManYen} onChange={(value) => updateSimulator("buildingCostManYen", value)} disabled={!productCostProfile.buildingCostApplicable} />
                <NumberField label="土地面積（坪）" value={simulator.landAreaTsubo} onChange={(value) => updateSimulator("landAreaTsubo", value)} />
                <NumberField label="目標粗利率（%）" value={simulator.targetGrossMarginRate * 100} onChange={(value) => updateSimulator("targetGrossMarginRate", value / 100)} step={0.5} />
              </div>
              <small className="simulator-note">{productCostProfile.note}</small>
              <div className="ceiling-result"><span>土地仕入上限</span><strong>{manYen(procurement.landAcquisitionLimitManYen)}</strong><small>坪単価上限 {manYen(procurement.landPriceLimitManYenPerTsubo)} / 安全余裕 {manYen(procurement.safetyMarginManYen)}</small></div>
              <div className="sensitivity-table"><div className="sensitivity-head"><span>販売価格感度</span><span>想定利益</span></div>{[-10, -5, 0, 5].map((delta) => { const result = calculateProcurementCeiling({ ...simulator, expectedSalePriceManYen: simulator.expectedSalePriceManYen * (1 + delta / 100) }); return <div key={delta}><span>{delta === 0 ? "基準" : `${delta > 0 ? "+" : ""}${delta}%`}</span><b>{manYen(result.expectedProfitManYen)}</b></div>; })}</div>
            </section>
            <section className="drawer-section source-section"><div className="drawer-section-heading"><Database size={16} /><h3>情報ソース</h3></div><p>{primaryArea.area.source === "sample" ? "開発用サンプルデータ" : "外部データ"}</p><small>基準日：2026年 / 地域単位：{primaryArea.area.analysisUnit} / 取得値がない項目は「データなし」と表示します。</small></section>
        </aside>
      </div>
    </main>
  );
}

function AreaDetail({ area, report, adjustedOpportunity, listingSearch, selectedListingId, onSearchListings, onSelectListing }: { area: RankedArea; report: MarketReport; adjustedOpportunity: ReturnType<typeof calculateLayerAdjustedOpportunityScore>; listingSearch: ListingSearchState; selectedListingId: string | null; onSearchListings: (area: RankedArea) => void; onSelectListing: (listing: LandListing) => void }) {
  const breakdown = area.scoreBreakdown.filter((item) => item.value !== null);
  return <div className="drawer-content">
    <section className="drawer-section rating-section"><div className="drawer-section-heading"><TrendingUp size={16} /><h3>仕入れ分析</h3></div><div className="rating-main"><span className={opportunityTone(adjustedOpportunity.score)}>{opportunityLabel(adjustedOpportunity.score)}</span><strong>{score(adjustedOpportunity.score)}</strong></div><p>{adjustedOpportunity.recalculated ? "仕入分析の5指標と選択中の外部レイヤーを反映して仕入れ評点を算出しています。" : area.reasons[3] ?? area.reasons[0]}</p><ProcurementAnalysisDetails area={area} />{adjustedOpportunity.recalculated ? <small className="drawer-note">評価項目：{adjustedOpportunity.activeLabels.join("・")}（基準評点 {score(adjustedOpportunity.baseScore)}）</small> : null}</section>
    <LandListingPanel area={area} listingSearch={listingSearch} selectedListingId={selectedListingId} onSearch={() => onSearchListings(area)} onSelectListing={onSelectListing} />
    <Accordion title="総合評価・スコア内訳" icon={<TrendingUp size={16} />} open><div className="breakdown-list">{breakdown.map((item) => <div className="breakdown-row" key={item.key}><span>{item.label}<small>{item.source}</small></span><b>{item.value === null ? "データなし" : score(item.value)}</b><i style={{ width: `${Math.max(5, Math.min(100, item.value ?? 0))}%` }} /></div>)}</div></Accordion>
    <Accordion title="需給" icon={<BarChart3 size={16} />} open><MetricList items={[["需要スコア", score(area.demandScore)], ["供給スコア", score(area.supplyScore)], ["需給ギャップ", `${area.demandSupplyGap > 0 ? "+" : ""}${score(area.demandSupplyGap)}`], ["流動性", score(area.liquidityScore)]]} /></Accordion>
    <Accordion title="相場・人口" icon={<MapPinned size={16} />} open><MetricList items={[["人口", `${area.area.population.toLocaleString("ja-JP")}人`], ["世帯数", `${area.area.households.toLocaleString("ja-JP")}世帯`], ["人口5年増減", percent(area.area.populationGrowthRate)], ["世帯増減", percent(area.area.householdGrowthRate)], ["平均世帯年収", manYen(area.area.averageIncomeManYen)], ["土地平均", `${manYen(area.area.averageLandPriceManYenPerTsubo)}/坪`], ["取引件数", `${area.area.transactionCount}件`]]} /></Accordion>
    <Accordion title="都市計画・ハザード" icon={<ShieldAlert size={16} />}><MetricList items={[["用途地域", "データなし"], ["洪水", "データなし"], ["土砂災害", "データなし"]]} /><small className="drawer-note">ハザードAPI接続後に地点単位で表示</small></Accordion>
    <Accordion title="仕入判断メモ" icon={<Target size={16} />}><p className="drawer-copy">{report.actions[0]}</p><p className="drawer-copy">{report.actions[1]}</p></Accordion>
  </div>;
}

function LandListingPanel({ area, listingSearch, selectedListingId, onSearch, onSelectListing }: { area: RankedArea; listingSearch: ListingSearchState; selectedListingId: string | null; onSearch: () => void; onSelectListing: (listing: LandListing) => void }) {
  const isCurrentArea = listingSearch.areaId === area.area.id;
  const status = isCurrentArea ? listingSearch.status : "idle";
  const listings = isCurrentArea ? listingSearch.listings : [];

  return <section className="drawer-section listing-section" aria-live="polite">
    <div className="drawer-section-heading"><Search size={16} /><h3>土地売出情報</h3><small>{area.area.neighborhood}</small></div>
    <button className="listing-search-button" disabled={status === "loading"} onClick={onSearch} type="button"><Search size={15} />{status === "loading" ? "売出情報を検索中" : "売出情報を検索する"}</button>
    {status === "idle" ? <small className="listing-note">レインズ・HOME'S・SUUMO・at home・楽待・健美家の候補を検索します。</small> : null}
    {status === "error" ? <p className="listing-error">{listingSearch.message}</p> : null}
    {status === "loaded" ? <>
      <div className="listing-results-meta"><strong>{listings.length}件の候補土地</strong><span>{listingSearch.sourceMode === "preview" ? "開発用プレビュー" : "外部取得データ"}</span></div>
      {listingSearch.message ? <small className="listing-note">{listingSearch.message}</small> : null}
      <div className="land-listing-list">
        {listings.map((listing) => {
          const selected = selectedListingId === listing.id;
          return <article className={`land-listing-card${selected ? " selected" : ""}`} key={listing.id}>
            <div className="land-listing-card-heading"><div><strong>{listing.title}</strong><small>{listing.sourceLabel} / {listing.dataMode === "preview" ? "プレビュー" : "取得済み"}</small></div><b>{manYen(listing.priceManYen)}</b></div>
            <p>{listing.address}</p>
            <dl className="land-listing-metrics"><div><dt>土地面積</dt><dd>{listing.landAreaTsubo}坪</dd></div><div><dt>坪単価</dt><dd>{manYen(listing.pricePerTsuboManYen)}/坪</dd></div><div><dt>駅徒歩</dt><dd>{listing.station} 徒歩{listing.walkMinutes}分</dd></div><div><dt>用途地域</dt><dd>{listing.zoning}</dd></div></dl>
            <div className="land-listing-actions"><button className="listing-select-button" aria-pressed={selected} onClick={() => onSelectListing(listing)} type="button">{selected ? "候補選択中" : "候補に選択"}</button><a href={listing.dataMode === "preview" ? listing.listingUrl : listing.inquiryUrl} rel="noreferrer" target="_blank"><ExternalLink size={13} />{listing.dataMode === "preview" ? "掲載元サイトを開く" : "問い合わせ先へ"}</a></div>
          </article>;
        })}
      </div>
    </> : null}
  </section>;
}

function SelectedAreaSummary({ area, adjustedOpportunity, selected }: { area: RankedArea; adjustedOpportunity: ReturnType<typeof calculateLayerAdjustedOpportunityScore>; selected: boolean }) {
  return <section className="sidebar-selected-area" aria-live="polite">
    <div className="sidebar-selected-area-heading"><Target size={15} /><div><span>{selected ? "地図で選択中" : "分析対象"}</span><strong>{area.area.neighborhood}</strong><small>{area.area.municipality} / {area.area.analysisUnit}</small></div></div>
    <div className="sidebar-selected-score"><span>仕入評点</span><strong>{score(adjustedOpportunity.score)}</strong><em className={opportunityTone(adjustedOpportunity.score)}>{opportunityLabel(adjustedOpportunity.score)}</em></div>
    <div className="sidebar-selected-metrics"><div><span>需要</span><b>{score(area.demandScore)}</b></div><div><span>供給</span><b>{score(area.supplyScore)}</b></div><div><span>需給ギャップ</span><b>{score(area.demandSupplyGap)}</b></div><div><span>土地平均</span><b>{manYen(area.area.averageLandPriceManYenPerTsubo)}/坪</b></div></div>
  </section>;
}

function ProcurementAnalysisDetails({ area }: { area: RankedArea }) {
  const metrics: Array<[string, string, string]> = [
    ["需要スコア", score(area.demandScore), "人口・世帯・子育て世帯・所得"],
    ["供給スコア", score(area.supplyScore), "新築供給・土地売出・競合供給"],
    ["需給ギャップ", `${area.demandSupplyGap > 0 ? "+" : ""}${score(area.demandSupplyGap)}`, "需要スコア − 供給スコア"],
    ["仕入機会スコア", score(area.opportunityScore), "流動性・需給・収益性・リスク"],
    ["仕入候補 TOP10", `${area.rank}位`, "選択市区町村内の候補順位"]
  ];

  return <div className="procurement-analysis-details"><div className="procurement-analysis-heading"><strong>評価指標の内訳</strong><small>地図レイヤーではありません</small></div><div className="procurement-analysis-list">{metrics.map(([label, value, source]) => <div className="procurement-analysis-row" key={label}><div><strong>{label}</strong><small>{source}</small></div><b>{value}</b></div>)}</div></div>;
}

function CandidateOverview({ areas, scoreLayerIds, selectedArea, onAreaSelect }: { areas: RankedArea[]; scoreLayerIds: string[]; selectedArea: RankedArea; onAreaSelect: (area: RankedArea) => void }) {
  return <section className="drawer-section candidate-overview">
    <div className="drawer-section-heading"><Target size={16} /><h3>仕入れ候補</h3><small>TOP10 / 地図上の候補</small></div>
    <div className="drawer-candidate-list">
      {areas.map((item) => { const adjusted = calculateLayerAdjustedOpportunityScore(item, scoreLayerIds); return <button className={selectedArea.area.id === item.area.id ? "selected" : ""} key={item.area.id} onClick={() => onAreaSelect(item)} type="button"><span className="candidate-rank">{item.rank}</span><span className="candidate-name"><strong>{item.area.neighborhood}</strong><small>{item.area.municipality}</small></span><b className={opportunityTone(adjusted.score)}>{score(adjusted.score)}</b></button>; })}
    </div>
  </section>;
}

function FeatureDetail({ feature }: { feature: MapFeatureSelection }) {
  const sourceLabel = feature.source === "gate-api"
    ? "Gate API"
    : feature.source === "real-estate-library"
      ? "国土交通省 不動産情報ライブラリAPI"
      : feature.source === "sample" || feature.source === "preview"
        ? "接続前プレビュー"
        : feature.source === "openstreetmap"
          ? "OpenStreetMap / Overpass"
          : "未特定";
  const features = feature.features.length > 0 ? feature.features : [feature];
  return <div className="drawer-content"><section className="drawer-section rating-section"><div className="feature-source-badge" style={{ borderColor: feature.layer.color }}><span style={{ background: feature.layer.color }} />{features.length > 1 ? `${features.length}レイヤーを選択中` : feature.layer.label}</div><p>地図上で選択した地点に重なる全レイヤーの実データを表示しています。</p></section><Accordion title="Feature属性" icon={<Database size={16} />} open><div className="feature-detail-groups">{features.map((item) => <section className="feature-detail-group" key={item.layer.id}><strong>{item.layer.label}</strong><MetricList items={item.rows.map((row) => [row.label, row.value])} /></section>)}</div></Accordion><Accordion title="取得情報" icon={<CircleHelp size={16} />} open><div className="feature-detail-groups">{features.map((item) => <section className="feature-detail-group" key={item.layer.id}><strong>{item.layer.label}</strong><MetricList items={[["データソース", item.source === "gate-api" ? "Gate API" : item.source === "real-estate-library" ? "国土交通省 不動産情報ライブラリAPI" : item.source === "sample" || item.source === "preview" ? "接続前プレビュー" : item.source === "openstreetmap" ? "OpenStreetMap / Overpass" : sourceLabel], ["レイヤーID", item.layer.id], ["基準年", item.layer.dataSourceYear], ["地域単位", "API Feature"]]} /></section>)}</div></Accordion></div>;
}

function Accordion({ title, icon, children, open = false, note }: { title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean; note?: string }) {
  return <details className="drawer-accordion" open={open}><summary><span>{icon}{title}</span><ChevronDown size={15} /></summary><div className="drawer-accordion-body">{children}{note ? <small className="drawer-note">{note}</small> : null}</div></details>;
}

function MetricList({ items }: { items: Array<[string, string]> }) {
  return <dl className="metric-list">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value === "データなし" ? "no-data" : ""}>{value}</dd></div>)}</dl>;
}

function NumberField({ label, value, onChange, step = 1, disabled = false }: { label: string; value: number; onChange: (value: number) => void; step?: number; disabled?: boolean }) {
  return <label className="number-field"><span>{label}</span><input disabled={disabled} inputMode="decimal" min="0" step={step} type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function resolveAreas(areas: RankedArea[], query: SearchForm) {
  const sameMunicipality = areas.filter((item) => item.area.prefecture === query.prefecture && item.area.municipality === query.municipality);
  const base = sameMunicipality.length > 0 ? sameMunicipality : areas.filter((item) => item.area.prefecture === query.prefecture);
  const searchText = `${query.station} ${query.placeName}`.trim().toLowerCase();
  const filtered = searchText ? base.filter((item) => `${item.area.neighborhood} ${item.area.municipality}`.toLowerCase().includes(searchText)) : base;
  const candidates = filtered.length > 0 ? filtered : base.length > 0 ? base : areas;
  return [...candidates]
    .sort((a, b) => {
      const aExact = a.area.neighborhood === query.address ? 1 : 0;
      const bExact = b.area.neighborhood === query.address ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return b.opportunityScore - a.opportunityScore || a.rank - b.rank;
    })
    .map((item, index) => ({
      ...item,
      // The map and candidate list use the selected municipality's local order.
      rank: index + 1,
    }));
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
