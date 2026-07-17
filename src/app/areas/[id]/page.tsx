import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Definition, QuadrantChart } from "@/components/MarketReport";
import { decimalManYen, manYen, percent, quadrantLabel, score } from "@/lib/market/format";
import { analyzeMarket } from "@/lib/market/report";

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = analyzeMarket();
  const area = report.rankings.neighborhoods.find((item) => item.area.id === id);
  if (!area) notFound();

  return (
    <main>
      <AppHeader />
      <section className="page-section">
        <p className="eyebrow">Area Detail</p>
        <h1>{area.area.municipality} {area.area.neighborhood}</h1>
        <p className="lead">{quadrantLabel(area.quadrant)} / 総合スコア {score(area.overallScore)}点</p>
      </section>

      <section className="page-section dashboard-grid">
        <article className="panel">
          <h2>エリア基本情報</h2>
          <div className="definition-grid">
            <Definition label="人口" value={`${area.area.population.toLocaleString("ja-JP")}人`} />
            <Definition label="世帯数" value={`${area.area.households.toLocaleString("ja-JP")}世帯`} />
            <Definition label="人口増減率" value={percent(area.area.populationGrowthRate)} />
            <Definition label="世帯増減率" value={percent(area.area.householdGrowthRate)} />
            <Definition label="子育て世帯比率" value={percent(area.area.childHouseholdRate)} />
            <Definition label="データ信頼度" value={`${score(area.dataConfidenceScore)}点`} />
          </div>
        </article>
        <article className="panel">
          <h2>年収・購買力</h2>
          <div className="definition-grid">
            <Definition label="平均世帯年収" value={manYen(area.area.averageIncomeManYen)} />
            <Definition label="購買力スコア" value={`${score(area.purchasingPowerScore)}点`} />
            <Definition label="想定販売価格" value={manYen(area.area.averageSalePriceManYen)} />
            <Definition label="地価/坪" value={manYen(area.area.averageLandPriceManYenPerTsubo)} />
          </div>
        </article>
      </section>

      <section className="page-section dashboard-grid">
        <article className="panel">
          <h2>住宅供給・競合状況</h2>
          <div className="definition-grid">
            <Definition label="新築戸建供給" value={`${area.area.newDetachedSupplyCount}件`} />
            <Definition label="土地売出" value={`${area.area.landListingCount}件`} />
            <Definition label="競合供給" value={`${area.area.competitorSupplyCount}件`} />
            <Definition label="成約日数" value={`${area.area.daysOnMarket}日`} />
            <Definition label="供給不足" value={`${score(area.supplyShortageScore)}点`} />
            <Definition label="推奨商品" value={area.area.productType} />
          </div>
        </article>
        <article className="panel">
          <h2>賃料・分譲価格相場</h2>
          <div className="definition-grid">
            <Definition label="賃料相場" value={decimalManYen(area.area.averageRentManYen)} />
            <Definition label="分譲価格相場" value={manYen(area.area.averageSalePriceManYen)} />
            <Definition label="賃貸世帯比率" value={percent(area.area.rentHouseholdRate)} />
            <Definition label="空き家率" value={percent(area.area.vacancyRate)} />
          </div>
        </article>
      </section>

      <section className="page-section">
        <h2>4象限内の位置</h2>
        <QuadrantChart areas={report.quadrant} />
      </section>

      <section className="page-section">
        <h2>営業・仕入れアクション</h2>
        <ul className="action-list">
          {area.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
