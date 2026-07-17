import { describe, expect, it } from "vitest";
import { classifyQuadrant, normalizeScore, rankAreas, scoreArea } from "./scoring";
import { scoreWeights } from "./weights";
import type { AreaMetric } from "./types";

const sampleArea: AreaMetric = {
  id: "aoba-utsukushi-1",
  municipalityId: "aoba",
  prefecture: "神奈川県",
  municipality: "横浜市青葉区",
  neighborhood: "美しが丘1丁目",
  analysisUnit: "町丁目",
  productType: "分譲戸建",
  population: 4200,
  households: 1850,
  populationGrowthRate: 0.042,
  householdGrowthRate: 0.051,
  moveInCount: 340,
  moveOutCount: 261,
  childHouseholdRate: 0.28,
  averageIncomeManYen: 980,
  rentHouseholdRate: 0.41,
  newDetachedSupplyCount: 12,
  landListingCount: 8,
  competitorSupplyCount: 6,
  housingStarts: 34,
  transactionCount: 44,
  averageLandPriceManYenPerTsubo: 155,
  averageSalePriceManYen: 7580,
  averageRentManYen: 20.5,
  daysOnMarket: 39,
  vacancyRate: 0.045,
  dataConfidenceScore: 88,
  lat: 35.577,
  lng: 139.557,
  source: "sample"
};

describe("market scoring", () => {
  it("normalizes a value into a 0 to 100 score", () => {
    expect(normalizeScore(10, 0, 20)).toBe(50);
    expect(normalizeScore(40, 0, 20)).toBe(100);
    expect(normalizeScore(3, 10, 10)).toBe(50);
  });

  it("scores an area and derives blue ocean priority", () => {
    const result = scoreArea(sampleArea, scoreWeights);

    expect(result.liquidityScore).toBeGreaterThan(80);
    expect(result.demandScore).toBeGreaterThan(80);
    expect(result.supplyShortageScore).toBeGreaterThan(70);
    expect(result.blueOceanScore).toBeGreaterThan(result.redOceanScore);
    expect(result.quadrant).toBe("blue-ocean");
  });

  it("classifies liquidity and supply balance into the expected quadrant", () => {
    expect(classifyQuadrant(82, 78)).toBe("blue-ocean");
    expect(classifyQuadrant(82, 28)).toBe("competitive");
    expect(classifyQuadrant(42, 78)).toBe("niche");
    expect(classifyQuadrant(42, 28)).toBe("red-ocean");
  });

  it("ranks areas by overall score and keeps stable details", () => {
    const lowSupplyArea = { ...sampleArea, id: "low", newDetachedSupplyCount: 4, landListingCount: 4 };
    const crowdedArea = { ...sampleArea, id: "crowded", newDetachedSupplyCount: 55, landListingCount: 35, competitorSupplyCount: 30 };

    const ranked = rankAreas([crowdedArea, lowSupplyArea], scoreWeights);

    expect(ranked[0].area.id).toBe("low");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].quadrant).toBe("competitive");
  });
});
