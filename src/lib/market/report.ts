import { calculateBorrowingCapacity, calculateLandAcquisitionLimit, compareRentVsBuy } from "./finance";
import { rankAreas } from "./scoring";
import { defaultAnalysisInput, sampleAreas } from "./sampleData";
import type { AnalysisInput, AreaMetric, MarketReport, RankedArea } from "./types";
import { scoreWeights } from "./weights";

const createdAt = "2026-06-17T00:00:00.000+09:00";

export function getSampleInput(): AnalysisInput {
  return { ...defaultAnalysisInput };
}

export function getAreas(): AreaMetric[] {
  return sampleAreas.map((area) => ({ ...area }));
}

export function analyzeMarket(input: AnalysisInput = getSampleInput()): MarketReport {
  const relevantAreas = sampleAreas.filter((area) => area.prefecture === input.prefecture);
  const rankedNeighborhoods = rankAreas(relevantAreas, scoreWeights);
  const rankedMunicipalities = rankMunicipalities(relevantAreas);
  const blueOceanTop3 = rankedNeighborhoods
    .filter((area) => area.quadrant === "blue-ocean")
    .sort((a, b) => b.blueOceanScore - a.blueOceanScore)
    .slice(0, 3)
    .map((area, index) => ({ ...area, rank: index + 1 }));
  const primary = blueOceanTop3[0] ?? rankedNeighborhoods[0];
  const expectedIncome = primary.area.averageIncomeManYen;
  const borrowing = calculateBorrowingCapacity({
    householdIncomeManYen: expectedIncome,
    repaymentBurdenRate: input.repaymentBurdenRate,
    annualInterestRate: input.annualInterestRate,
    repaymentYears: input.repaymentYears,
    downPaymentManYen: input.downPaymentManYen
  });
  const landAcquisition = calculateLandAcquisitionLimit({
    purchaseCapacityManYen: borrowing.purchaseCapacityManYen,
    buildingCostManYen: input.expectedBuildingPriceManYen,
    exteriorCostManYen: 250,
    closingCostManYen: Math.round(borrowing.purchaseCapacityManYen * 0.06),
    salesAdminCostManYen: Math.round(borrowing.purchaseCapacityManYen * 0.04),
    otherCostManYen: Math.round(borrowing.purchaseCapacityManYen * input.otherCostRate),
    targetGrossMarginRate: input.targetGrossMarginRate
  });
  const rentVsBuy = compareRentVsBuy({
    monthlyRentManYen: primary.area.averageRentManYen,
    commonServiceFeeManYen: 1.2,
    parkingFeeManYen: 1.8,
    renewalFeeManYen: primary.area.averageRentManYen,
    purchasePriceManYen: Math.round(primary.area.averageSalePriceManYen * 0.9),
    downPaymentManYen: input.downPaymentManYen,
    annualInterestRate: input.annualInterestRate,
    repaymentYears: input.repaymentYears,
    annualPropertyTaxManYen: 18,
    monthlyRepairReserveManYen: 2.2,
    monthlyInsuranceManYen: 0.4,
    monthlyOtherMaintenanceManYen: 0.7
  });
  const recommendedPrice = Math.round((landAcquisition.recommendedSalePriceRangeManYen[0] + landAcquisition.recommendedSalePriceRangeManYen[1]) / 2);
  const marketAveragePrice = Math.round(
    blueOceanTop3.reduce((sum, item) => sum + item.area.averageSalePriceManYen, 0) / Math.max(blueOceanTop3.length, 1)
  );
  const priceGapRate = Math.round(((recommendedPrice - marketAveragePrice) / marketAveragePrice) * 1000) / 10;

  return {
    id: "sample-aoba-report",
    title: "ハウスメーカー向け市場分析レポート 横浜市青葉区",
    createdAt,
    input,
    sourceMode: "sample",
    executiveSummary: {
      totalScore: primary.overallScore,
      primaryMunicipality: primary.area.municipality,
      focusAreas: blueOceanTop3.map((item) => item.area.neighborhood),
      targetSegment: "世帯年収900万円以上の子育て・住み替え検討世帯",
      expectedHouseholdIncomeManYen: expectedIncome,
      recommendedSalePriceRangeManYen: landAcquisition.recommendedSalePriceRangeManYen,
      landAcquisitionLimitManYen: landAcquisition.landAcquisitionLimitManYen,
      decisionComments: buildDecisionComments(primary, blueOceanTop3, landAcquisition)
    },
    rankings: {
      municipalities: rankedMunicipalities,
      neighborhoods: rankedNeighborhoods
    },
    quadrant: rankedNeighborhoods,
    blueOceanTop3,
    landAcquisition,
    borrowing,
    rentVsBuy,
    marketGap: {
      marketAveragePriceManYen: marketAveragePrice,
      recommendedPriceManYen: recommendedPrice,
      priceGapRate,
      judgment: Math.abs(priceGapRate) <= 5 ? "適正" : priceGapRate < -5 ? "割安" : "割高",
      action: priceGapRate > 5 ? "商品グレード調整または土地面積の見直し" : "仕入れ強化"
    },
    actions: [
      `${primary.area.neighborhood}は土地売出件数が少ないため、未公開土地情報の取得網を優先的に強化する。`,
      `競合供給が少ないエリアでは${input.productType}の一次取得者向け価格帯を先行検証する。`,
      "供給が多い駅勢圏は営業強化よりも商品差別化と粗利率維持を優先する。"
    ],
    appendix: {
      dataSources: [
        "オープンデータ: Gate API GeoJSONレイヤー",
        "ローカルデータ棚卸し: DATA_CATALOG_ROOTSで指定したCSV/JSON",
        "MVP分析値: 横浜市青葉区周辺のサンプルデータ"
      ],
      definitions: [
        "流動性スコア: 人口増減、世帯増減、転入超過、取引件数、成約速度、空き家率を0から100に正規化した指数。",
        "需要スコア: 人口・世帯増加、子育て世帯比率、平均世帯年収、賃貸居住世帯比率から算出。",
        "供給不足スコア: 新築戸建供給、土地売出、競合供給、住宅着工、成約速度から見た供給圧力を反転。"
      ],
      formulas: [
        "総合スコア = 流動性×0.25 + 需要×0.25 + 供給不足×0.20 + 購買力×0.20 + データ信頼度×0.10",
        "ブルーオーシャンスコア = 需要×0.35 + 流動性×0.25 + 供給不足×0.25 + 購買力×0.15 - 競合過多ペナルティ",
        "年間返済可能額 = 世帯年収 × 返済負担率",
        "借入可能額 = 月間返済可能額 × ((1 - (1 + 月利)^-返済月数) / 月利)",
        "土地仕入れ上限価格 = 購入可能総額 - 建物原価 - 外構費 - 諸経費 - 販管費 - その他コスト - 必要粗利"
      ],
      missingValuePolicy: [
        "必須値がない指標はデータ不足として扱い、スコアに反映しません。",
        "代替値で補完した場合はAppendixに補完方法を表示します。",
        "欠損が多いエリアはデータ信頼度スコアを下げます。"
      ],
      assumptions: [
        "現時点のMVPはサンプルデータを用いて分析体験を優先しています。",
        "実データCSV/JSONはdata_catalog.jsonに棚卸し済みで、後続実装でAreaMetricへマッピング可能な構成です。",
        "土地仕入れ上限価格は購入可能総額を販売価格上限とみなし、目標粗利を販売価格に対する率として計算しています。"
      ],
      disclaimer: "本レポートは意思決定支援を目的とした試算です。仕入れ判断時は現地調査、法規制、個別土地条件、最新の成約事例を必ず確認してください。"
    }
  };
}

function rankMunicipalities(areas: AreaMetric[]): RankedArea[] {
  const groups = new Map<string, AreaMetric[]>();
  for (const area of areas) {
    groups.set(area.municipalityId, [...(groups.get(area.municipalityId) ?? []), area]);
  }
  const synthetic = [...groups.values()].map((items) => {
    const first = items[0];
    const avg = (selector: (area: AreaMetric) => number) =>
      Math.round((items.reduce((sum, item) => sum + selector(item), 0) / items.length) * 1000) / 1000;
    return {
      ...first,
      id: first.municipalityId,
      neighborhood: "市区町村平均",
      analysisUnit: "市区町村",
      population: items.reduce((sum, item) => sum + item.population, 0),
      households: items.reduce((sum, item) => sum + item.households, 0),
      populationGrowthRate: avg((item) => item.populationGrowthRate),
      householdGrowthRate: avg((item) => item.householdGrowthRate),
      moveInCount: items.reduce((sum, item) => sum + item.moveInCount, 0),
      moveOutCount: items.reduce((sum, item) => sum + item.moveOutCount, 0),
      childHouseholdRate: avg((item) => item.childHouseholdRate),
      averageIncomeManYen: avg((item) => item.averageIncomeManYen),
      rentHouseholdRate: avg((item) => item.rentHouseholdRate),
      newDetachedSupplyCount: items.reduce((sum, item) => sum + item.newDetachedSupplyCount, 0),
      landListingCount: items.reduce((sum, item) => sum + item.landListingCount, 0),
      competitorSupplyCount: items.reduce((sum, item) => sum + item.competitorSupplyCount, 0),
      housingStarts: items.reduce((sum, item) => sum + item.housingStarts, 0),
      transactionCount: items.reduce((sum, item) => sum + item.transactionCount, 0),
      averageLandPriceManYenPerTsubo: avg((item) => item.averageLandPriceManYenPerTsubo),
      averageSalePriceManYen: avg((item) => item.averageSalePriceManYen),
      averageRentManYen: avg((item) => item.averageRentManYen),
      daysOnMarket: avg((item) => item.daysOnMarket),
      vacancyRate: avg((item) => item.vacancyRate),
      dataConfidenceScore: avg((item) => item.dataConfidenceScore)
    } satisfies AreaMetric;
  });

  return rankAreas(synthetic, scoreWeights);
}

function buildDecisionComments(primary: RankedArea, top3: RankedArea[], land: MarketReport["landAcquisition"]) {
  return [
    `${primary.area.municipality}は高所得世帯が多く、戸建購買力が高い一方で、新築戸建供給が限定的なため仕入れ強化候補として有望です。`,
    `${top3.map((item) => item.area.neighborhood).join("、")}は流動性と購買力のバランスが良く、重点調査対象です。`,
    `平均世帯年収から逆算した土地仕入れ上限価格は約${Math.round(land.landAcquisitionLimitManYen).toLocaleString("ja-JP")}万円です。`,
    "競合供給が多い駅勢圏はレッドオーシャン化しやすいため、商品差別化または見送り判定を組み合わせてください。"
  ];
}
