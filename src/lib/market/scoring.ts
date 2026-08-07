import type { AreaMetric, Quadrant, RankedArea, ScoreBreakdownItem, ScoreResult, ScoreWeights } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function normalizeScore(value: number, min: number, max: number) {
  if (min === max) return 50;
  return round(clamp(((value - min) / (max - min)) * 100));
}

function weighted(parts: Array<[number, number]>) {
  const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0);
  return round(parts.reduce((sum, [score, weight]) => sum + score * weight, 0) / totalWeight);
}

export function classifyQuadrant(liquidityScore: number, supplyShortageScore: number): Quadrant {
  const highLiquidity = liquidityScore >= 55;
  const supplyShortage = supplyShortageScore >= 55;
  if (highLiquidity && supplyShortage) return "blue-ocean";
  if (highLiquidity && !supplyShortage) return "competitive";
  if (!highLiquidity && supplyShortage) return "niche";
  return "red-ocean";
}

export function scoreArea(area: AreaMetric, weights: ScoreWeights): ScoreResult {
  const netMoveRate = (area.moveInCount - area.moveOutCount) / Math.max(area.population, 1);
  const liquidityScore = weighted([
    [normalizeScore(area.populationGrowthRate, -0.03, 0.05), 0.22],
    [normalizeScore(area.householdGrowthRate, -0.02, 0.06), 0.22],
    [normalizeScore(netMoveRate, -0.02, 0.03), 0.16],
    [normalizeScore(area.transactionCount / Math.max(area.households, 1), 0.002, 0.03), 0.16],
    [100 - normalizeScore(area.daysOnMarket, 25, 120), 0.12],
    [100 - normalizeScore(area.vacancyRate, 0.03, 0.16), 0.12]
  ]);
  const demandScore = weighted([
    [normalizeScore(area.populationGrowthRate, -0.03, 0.05), 0.2],
    [normalizeScore(area.householdGrowthRate, -0.02, 0.06), 0.2],
    [normalizeScore(area.childHouseholdRate, 0.08, 0.32), 0.2],
    [normalizeScore(area.averageIncomeManYen, 450, 1000), 0.25],
    [normalizeScore(area.rentHouseholdRate, 0.18, 0.48), 0.15]
  ]);
  const supplyPressure = weighted([
    [normalizeScore(area.newDetachedSupplyCount + area.landListingCount, 0, 90), 0.38],
    [normalizeScore(area.competitorSupplyCount, 0, 35), 0.24],
    [normalizeScore(area.housingStarts, 0, 90), 0.18],
    [normalizeScore(area.daysOnMarket, 25, 120), 0.2]
  ]);
  const supplyScore = round(supplyPressure);
  const supplyShortageScore = round(100 - supplyScore);
  const purchasingPowerScore = weighted([
    [normalizeScore(area.averageIncomeManYen, 450, 1000), 0.7],
    [normalizeScore(area.averageSalePriceManYen, 4200, 8500), 0.15],
    [normalizeScore(area.averageRentManYen, 10, 24), 0.15]
  ]);
  const competitorOversupplyScore = normalizeScore(area.competitorSupplyCount + area.newDetachedSupplyCount, 0, 80);
  const demographicScore = weighted([
    [normalizeScore(area.populationGrowthRate, -0.03, 0.05), 0.35],
    [normalizeScore(area.householdGrowthRate, -0.02, 0.06), 0.35],
    [normalizeScore(area.childHouseholdRate, 0.08, 0.32), 0.3]
  ]);
  const demandSupplyGap = round(demandScore - supplyScore);
  const demandSupplyGapContributionScore = clamp(50 + demandSupplyGap / 2);
  const landPriceRiskScore = normalizeScore(area.averageLandPriceManYenPerTsubo, 80, 180);
  const opportunityBreakdown: ScoreBreakdownItem[] = [
    {
      key: "demand",
      label: "需要スコア",
      value: demandScore,
      weight: weights.opportunity.demand,
      contribution: demandScore * weights.opportunity.demand,
      direction: "positive",
      source: "人口・世帯・子育て世帯・所得"
    },
    {
      key: "supplyDemandGap",
      label: "需給ギャップ",
      value: demandSupplyGap,
      weight: weights.opportunity.supplyDemandGap,
      contribution: demandSupplyGapContributionScore * weights.opportunity.supplyDemandGap,
      direction: "positive",
      source: "需要スコア − 供給スコア"
    },
    {
      key: "liquidity",
      label: "流動性スコア",
      value: liquidityScore,
      weight: weights.opportunity.liquidity,
      contribution: liquidityScore * weights.opportunity.liquidity,
      direction: "positive",
      source: "人口移動・成約件数・成約期間・空き家率"
    },
    {
      key: "demographic",
      label: "人口・世帯スコア",
      value: demographicScore,
      weight: weights.opportunity.demographic,
      contribution: demographicScore * weights.opportunity.demographic,
      direction: "positive",
      source: "人口増減・世帯増減・子育て世帯"
    },
    {
      key: "accessibility",
      label: "交通・生活利便性",
      value: null,
      weight: weights.opportunity.accessibility,
      contribution: null,
      direction: "positive",
      source: "駅・学校・施設API未接続"
    },
    {
      key: "profitability",
      label: "収益性・購買力",
      value: purchasingPowerScore,
      weight: weights.opportunity.profitability,
      contribution: purchasingPowerScore * weights.opportunity.profitability,
      direction: "positive",
      source: "世帯年収・販売価格・賃料"
    },
    {
      key: "hazardRisk",
      label: "ハザードリスク",
      value: null,
      weight: weights.opportunity.hazardRisk,
      contribution: null,
      direction: "negative",
      source: "ハザードAPI未接続"
    },
    {
      key: "landPriceRisk",
      label: "土地価格リスク",
      value: landPriceRiskScore,
      weight: weights.opportunity.landPriceRisk,
      contribution: landPriceRiskScore * weights.opportunity.landPriceRisk,
      direction: "negative",
      source: "平均土地価格"
    }
  ];
  const availablePositiveWeight = opportunityBreakdown
    .filter((item) => item.direction === "positive" && item.value !== null)
    .reduce((sum, item) => sum + item.weight, 0);
  const availableNegativeWeight = opportunityBreakdown
    .filter((item) => item.direction === "negative" && item.value !== null)
    .reduce((sum, item) => sum + item.weight, 0);
  const positiveScore = opportunityBreakdown
    .filter((item) => item.direction === "positive" && item.value !== null)
    .reduce((sum, item) => sum + (item.contribution ?? 0), 0);
  const negativeScore = opportunityBreakdown
    .filter((item) => item.direction === "negative" && item.value !== null)
    .reduce((sum, item) => sum + (item.contribution ?? 0), 0);
  const positiveAverage = positiveScore / Math.max(availablePositiveWeight, 0.01);
  const negativeAverage = negativeScore / Math.max(availableNegativeWeight, 0.01);
  const availableWeight = availablePositiveWeight + availableNegativeWeight;
  const opportunityScore = round(
    clamp(positiveAverage - negativeAverage * (availableNegativeWeight / Math.max(availableWeight, 0.01)))
  );
  const blueOceanScore = round(
    clamp(
      demandScore * weights.blueOcean.demand +
        liquidityScore * weights.blueOcean.liquidity +
        supplyShortageScore * weights.blueOcean.supplyShortage +
        purchasingPowerScore * weights.blueOcean.purchasingPower -
        competitorOversupplyScore * weights.blueOcean.competitorPenalty
    )
  );
  const redOceanScore = round(clamp(competitorOversupplyScore * 0.65 + (100 - liquidityScore) * 0.35));
  const overallScore = round(
    liquidityScore * weights.overall.liquidity +
      demandScore * weights.overall.demand +
      supplyShortageScore * weights.overall.supplyShortage +
      purchasingPowerScore * weights.overall.purchasingPower +
      area.dataConfidenceScore * weights.overall.dataConfidence
  );
  const quadrant = classifyQuadrant(liquidityScore, supplyShortageScore);

  return {
    overallScore,
    liquidityScore,
    demandScore,
    supplyScore,
    supplyShortageScore,
    purchasingPowerScore,
    competitorOversupplyScore,
    blueOceanScore,
    redOceanScore,
    demandSupplyGap,
    opportunityScore,
    scoreBreakdown: opportunityBreakdown,
    dataConfidenceScore: area.dataConfidenceScore,
    quadrant,
    reasons: buildReasons(area, { liquidityScore, demandScore, supplyShortageScore, purchasingPowerScore, quadrant })
  };
}

export function rankAreas(areas: AreaMetric[], weights: ScoreWeights): RankedArea[] {
  return areas
    .map((area) => ({ area, ...scoreArea(area, weights) }))
    .sort((a, b) => b.overallScore - a.overallScore || b.blueOceanScore - a.blueOceanScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export interface LayerAdjustedOpportunityScore {
  score: number;
  baseScore: number;
  recalculated: boolean;
  activeLabels: string[];
}

type LayerScoreSignal = {
  label: string;
  value: number;
  weight: number;
};

export function calculateLayerAdjustedOpportunityScore(
  area: RankedArea,
  enabledLayerIds: string[]
): LayerAdjustedOpportunityScore {
  const signals = layerScoreSignals(area);
  const selectedSignals = enabledLayerIds
    .map((layerId) => signals[layerId])
    .filter((signal): signal is LayerScoreSignal => signal !== undefined);
  const activeLabels = selectedSignals.map((signal) => signal.label);

  if (selectedSignals.length < 2) {
    return {
      score: area.opportunityScore,
      baseScore: area.opportunityScore,
      recalculated: false,
      activeLabels
    };
  }

  const totalWeight = selectedSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const combinedScore = selectedSignals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / totalWeight;

  return {
    score: round(clamp(combinedScore)),
    baseScore: area.opportunityScore,
    recalculated: true,
    activeLabels
  };
}

function layerScoreSignals(area: RankedArea): Record<string, LayerScoreSignal> {
  const landPriceRiskScore = normalizeScore(area.area.averageLandPriceManYenPerTsubo, 80, 180);
  const gapScore = clamp(50 + area.demandSupplyGap / 2);
  const demographicScore = area.scoreBreakdown.find((item) => item.key === "demographic")?.value ?? area.demandScore;

  return {
    "demand-score": { label: "需要スコア", value: area.demandScore, weight: 1.2 },
    "supply-score": { label: "供給スコア", value: area.supplyShortageScore, weight: 1.1 },
    "supply-demand-gap": { label: "需給ギャップ", value: gapScore, weight: 1.2 },
    "procurement-opportunity": { label: "仕入機会スコア", value: area.opportunityScore, weight: 1.4 },
    "candidate-top10": { label: "仕入候補ランキング", value: area.overallScore, weight: 0.8 },
    "population-density": { label: "人口・人口増減", value: area.liquidityScore, weight: 0.8 },
    "household-income": { label: "世帯年収", value: area.purchasingPowerScore, weight: 0.9 },
    "household-change": { label: "世帯増減・年齢構成", value: demographicScore, weight: 0.9 },
    "future-population": { label: "子育て世代・将来人口", value: area.demandScore, weight: 0.9 },
    "rent-mean": { label: "賃料平均", value: area.purchasingPowerScore, weight: 0.7 },
    "land-price": { label: "地価公示", value: 100 - landPriceRiskScore, weight: 0.8 },
    "gross-rate": { label: "キャップレート", value: area.purchasingPowerScore, weight: 0.7 },
    "transaction-price": { label: "不動産取引価格", value: area.liquidityScore, weight: 0.8 },
    "past-transactions": { label: "過去取引・売出土地", value: area.liquidityScore, weight: 0.8 },
    transport: { label: "鉄道路線・駅", value: area.liquidityScore, weight: 0.5 },
    "elementary-school": { label: "小学校区", value: area.demandScore, weight: 0.5 },
    "use-district": { label: "用途地域", value: area.purchasingPowerScore, weight: 0.4 },
    "building-regulation": { label: "建蔽率・容積率", value: area.purchasingPowerScore, weight: 0.4 },
    development: { label: "建築確認・開発情報", value: area.liquidityScore, weight: 0.4 }
  };
}

function buildReasons(
  area: AreaMetric,
  scores: Pick<ScoreResult, "liquidityScore" | "demandScore" | "supplyShortageScore" | "purchasingPowerScore" | "quadrant">
) {
  const reasons = [
    `人口増減率${(area.populationGrowthRate * 100).toFixed(1)}%、世帯増減率${(area.householdGrowthRate * 100).toFixed(1)}%で流動性スコアは${scores.liquidityScore}点です。`,
    `平均世帯年収${area.averageIncomeManYen.toLocaleString("ja-JP")}万円、子育て世帯比率${(area.childHouseholdRate * 100).toFixed(1)}%から需要スコアは${scores.demandScore}点です。`,
    `新築戸建供給${area.newDetachedSupplyCount}件、土地売出${area.landListingCount}件、競合供給${area.competitorSupplyCount}件のため供給不足スコアは${scores.supplyShortageScore}点です。`
  ];

  if (scores.quadrant === "blue-ocean") {
    reasons.push("高流動性かつ供給不足のため、仕入れ強化対象として優先度が高いです。");
  } else if (scores.quadrant === "competitive") {
    reasons.push("需要はあるものの供給も多く、商品差別化または価格調整が必要です。");
  } else if (scores.quadrant === "niche") {
    reasons.push("供給不足は確認できますが、流動性が低いため個別物件の追加検証が必要です。");
  } else {
    reasons.push("流動性が低く供給も多いため、優先度は低めです。");
  }

  return reasons;
}
