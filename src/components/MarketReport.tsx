import Link from "next/link";
import { ArrowRight, Building2, Calculator, CircleDollarSign, Database, MapPinned, Target, TrendingUp } from "lucide-react";
import { OpenDataMarketMap } from "@/components/OpenDataMarketMap";
import { decimalManYen, manYen, percent, quadrantLabel, quadrantTone, score } from "@/lib/market/format";
import type { MarketReport as MarketReportType, RankedArea } from "@/lib/market/types";

export function KpiCards({ report }: { report: MarketReportType }) {
  const items = [
    ["総合評価", `${score(report.executiveSummary.totalScore)}点`, "重点仕入れ候補"],
    ["土地仕入れ上限", manYen(report.executiveSummary.landAcquisitionLimitManYen), "ターゲット年収から逆算"],
    ["推奨販売価格", `${manYen(report.executiveSummary.recommendedSalePriceRangeManYen[0])}〜${manYen(report.executiveSummary.recommendedSalePriceRangeManYen[1])}`, "粗利率18%前提"],
    ["購入転換余地", report.rentVsBuy.conversionPotential === "high" ? "高い" : report.rentVsBuy.conversionPotential === "medium" ? "中程度" : "低い", "賃貸 vs 分譲比較"]
  ];

  return (
    <div className="kpi-grid">
      {items.map(([label, value, note]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </article>
      ))}
    </div>
  );
}

export function RankingTable({ areas, compact = false }: { areas: RankedArea[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>順位</th>
            <th>エリア</th>
            <th>総合</th>
            <th>流動性</th>
            <th>需要</th>
            <th>供給不足</th>
            {!compact ? <th>推奨</th> : null}
          </tr>
        </thead>
        <tbody>
          {areas.map((item) => (
            <tr key={item.area.id}>
              <td>{item.rank}</td>
              <td>
                <Link href={`/areas/${item.area.id}`}>{item.area.municipality} {item.area.neighborhood}</Link>
              </td>
              <td>{score(item.overallScore)}</td>
              <td>{score(item.liquidityScore)}</td>
              <td>{score(item.demandScore)}</td>
              <td>{score(item.supplyShortageScore)}</td>
              {!compact ? <td>{quadrantLabel(item.quadrant)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BlueOceanTop3({ areas }: { areas: RankedArea[] }) {
  return (
    <div className="top3-grid">
      {areas.map((item) => (
        <article className="priority-card" key={item.area.id}>
          <div className="rank-badge">{item.rank}</div>
          <h3>{item.area.neighborhood}</h3>
          <p>{item.area.municipality}</p>
          <dl>
            <div>
              <dt>ブルーオーシャン</dt>
              <dd>{score(item.blueOceanScore)}</dd>
            </div>
            <div>
              <dt>平均年収</dt>
              <dd>{manYen(item.area.averageIncomeManYen)}</dd>
            </div>
            <div>
              <dt>想定販売価格</dt>
              <dd>{manYen(item.area.averageSalePriceManYen)}</dd>
            </div>
          </dl>
          <p className="reason">{item.reasons.at(-1)}</p>
          <Link className="text-link" href={`/areas/${item.area.id}`}>
            詳細を見る
            <ArrowRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  );
}

export function QuadrantChart({ areas }: { areas: RankedArea[] }) {
  return (
    <div className="quadrant-shell" aria-label="流動性と需給バランスの4象限チャート">
      <div className="axis-label top">供給不足</div>
      <div className="axis-label right">高流動性</div>
      <div className="quadrant-line vertical" />
      <div className="quadrant-line horizontal" />
      <div className="quadrant-name q1">ブルーオーシャン</div>
      <div className="quadrant-name q2">競争激化</div>
      <div className="quadrant-name q3">ニッチ候補</div>
      <div className="quadrant-name q4">レッドオーシャン</div>
      {areas.map((item) => (
        <Link
          href={`/areas/${item.area.id}`}
          className={`plot ${quadrantTone(item.quadrant)}`}
          style={{
            left: `${Math.max(7, Math.min(92, item.liquidityScore))}%`,
            bottom: `${Math.max(7, Math.min(90, item.supplyShortageScore))}%`
          }}
          key={item.area.id}
          title={`${item.area.neighborhood}: 流動性${score(item.liquidityScore)} 供給不足${score(item.supplyShortageScore)}`}
        >
          {item.rank}
        </Link>
      ))}
    </div>
  );
}

export function MarketMap({ areas }: { areas: RankedArea[] }) {
  return <OpenDataMarketMap areas={areas} />;
}

export function ExecutiveSummary({ report }: { report: MarketReportType }) {
  return (
    <section className="report-section">
      <div className="section-heading">
        <Target size={22} />
        <div>
          <p className="eyebrow">Executive Summary</p>
          <h2>エグゼクティブ・サマリー</h2>
        </div>
      </div>
      <KpiCards report={report} />
      <div className="comment-list">
        {report.executiveSummary.decisionComments.map((comment) => (
          <p key={comment}>{comment}</p>
        ))}
      </div>
    </section>
  );
}

export function FullReport({ report }: { report: MarketReportType }) {
  return (
    <div className="report-stack">
      <ExecutiveSummary report={report} />

      <section className="report-section">
        <div className="section-heading">
          <MapPinned size={22} />
          <div>
            <p className="eyebrow">Area Setting</p>
            <h2>対象エリア設定</h2>
          </div>
        </div>
        <div className="definition-grid">
          <Definition label="都道府県" value={report.input.prefecture} />
          <Definition label="市区町村" value={report.input.municipality} />
          <Definition label="町丁目" value={report.input.neighborhood} />
          <Definition label="分析単位" value={report.input.analysisUnit} />
          <Definition label="商品タイプ" value={report.input.productType} />
          <Definition label="目標粗利率" value={percent(report.input.targetGrossMarginRate)} />
        </div>
      </section>

      <section className="report-section two-column">
        <div>
          <div className="section-heading">
            <TrendingUp size={22} />
            <div>
              <p className="eyebrow">Ranking</p>
              <h2>市区町村・町丁目ランキング</h2>
            </div>
          </div>
          <RankingTable areas={report.rankings.municipalities} compact />
        </div>
        <div>
          <h3>町丁目ランキング</h3>
          <RankingTable areas={report.rankings.neighborhoods.slice(0, 6)} compact />
        </div>
      </section>

      <section className="report-section report-map-section">
        <div className="section-heading">
          <Building2 size={22} />
          <div>
            <p className="eyebrow">Supply Demand Map</p>
            <h2>流動性 × 需給バランス地図</h2>
          </div>
        </div>
        <MarketMap areas={report.quadrant} />
      </section>

      <section className="report-section">
        <div className="section-heading">
          <Target size={22} />
          <div>
            <p className="eyebrow">Blue Ocean</p>
            <h2>ブルーオーシャンTOP3</h2>
          </div>
        </div>
        <BlueOceanTop3 areas={report.blueOceanTop3} />
      </section>

      <section className="report-section two-column">
        <div>
          <div className="section-heading">
            <Calculator size={22} />
            <div>
              <p className="eyebrow">Land Acquisition</p>
              <h2>土地仕入れ限界価格逆算</h2>
            </div>
          </div>
          <div className="definition-grid">
            <Definition label="想定世帯年収" value={manYen(report.executiveSummary.expectedHouseholdIncomeManYen)} />
            <Definition label="月々返済可能額" value={decimalManYen(report.borrowing.monthlyRepaymentCapacityManYen)} />
            <Definition label="借入可能額" value={manYen(report.borrowing.borrowingCapacityManYen)} />
            <Definition label="購入可能総額" value={manYen(report.borrowing.purchaseCapacityManYen)} />
            <Definition label="必要粗利" value={manYen(report.landAcquisition.requiredGrossProfitManYen)} />
            <Definition label="土地仕入れ上限" value={manYen(report.landAcquisition.landAcquisitionLimitManYen)} />
          </div>
        </div>
        <div>
          <div className="section-heading">
            <CircleDollarSign size={22} />
            <div>
              <p className="eyebrow">Rent vs Buy</p>
              <h2>賃貸 vs 分譲比較</h2>
            </div>
          </div>
          <div className="definition-grid">
            <Definition label="賃貸月額" value={decimalManYen(report.rentVsBuy.rentMonthlyTotalManYen)} />
            <Definition label="購入後月額" value={decimalManYen(report.rentVsBuy.purchaseMonthlyTotalManYen)} />
            <Definition label="差額" value={decimalManYen(report.rentVsBuy.monthlyDifferenceManYen)} />
            <Definition label="35年賃貸累計" value={manYen(report.rentVsBuy.rentLifetimeCostManYen)} />
          </div>
          <p className="reason">{report.rentVsBuy.salesTalk}</p>
        </div>
      </section>

      <section className="report-section two-column">
        <div>
          <h2>市場相場との乖離分析</h2>
          <div className="definition-grid">
            <Definition label="市場平均価格" value={manYen(report.marketGap.marketAveragePriceManYen)} />
            <Definition label="推奨販売価格" value={manYen(report.marketGap.recommendedPriceManYen)} />
            <Definition label="価格乖離率" value={`${report.marketGap.priceGapRate}%`} />
            <Definition label="判定" value={report.marketGap.judgment} />
          </div>
        </div>
        <div>
          <h2>推奨アクション</h2>
          <ul className="action-list">
            {report.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="report-section">
        <div className="section-heading">
          <Database size={22} />
          <div>
            <p className="eyebrow">Appendix</p>
            <h2>算出根拠・データ根拠</h2>
          </div>
        </div>
        <Appendix report={report} />
      </section>
    </div>
  );
}

export function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="definition">
      <span className="definition-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Appendix({ report }: { report: MarketReportType }) {
  const groups = [
    ["使用データ一覧", report.appendix.dataSources],
    ["指標定義", report.appendix.definitions],
    ["スコア・計算式", report.appendix.formulas],
    ["欠損値処理", report.appendix.missingValuePolicy],
    ["仮定値", report.appendix.assumptions]
  ] as const;

  return (
    <div className="appendix-grid">
      {groups.map(([title, items]) => (
        <article className="appendix-block" key={title}>
          <h3>{title}</h3>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
      <article className="appendix-block wide">
        <h3>免責事項</h3>
        <p>{report.appendix.disclaimer}</p>
      </article>
    </div>
  );
}
