import { describe, expect, it } from "vitest";
import { analyzeMarket, getSampleInput } from "./report";

describe("market report assembly", () => {
  it("generates a decision-ready report from sample data", () => {
    const report = analyzeMarket(getSampleInput());

    expect(report.id).toBe("sample-aoba-report");
    expect(report.rankings.municipalities).toHaveLength(5);
    expect(report.blueOceanTop3).toHaveLength(3);
    expect(report.blueOceanTop3[0].area.neighborhood).toBe("美しが丘1丁目");
    expect(report.executiveSummary.decisionComments.join("")).toContain("供給");
    expect(report.landAcquisition.landAcquisitionLimitManYen).toBeGreaterThan(2000);
    expect(report.rentVsBuy.conversionPotential).toBe("high");
    expect(report.appendix.formulas.some((formula) => formula.includes("ブルーオーシャンスコア"))).toBe(true);
    expect(report.appendix.assumptions.join("")).toContain("サンプルデータ");
  });
});
