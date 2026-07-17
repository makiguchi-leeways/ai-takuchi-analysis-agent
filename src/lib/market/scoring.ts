import type { AreaMetric, Quadrant, RankedArea, ScoreResult, ScoreWeights } from "./types";

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
