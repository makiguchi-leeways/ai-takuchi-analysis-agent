import { describe, expect, it } from "vitest";
import { calculateCompetitionKpi } from "./competition";

describe("calculateCompetitionKpi", () => {
  it("calculates unit turnover and sales period from annual sales and month-end inventory", () => {
    const result = calculateCompetitionKpi({
      fiscalYear: "2025年度",
      netSalesOkuYen: 120,
      grossProfitOkuYen: 30,
      monthEndInventoryUnits: Array(12).fill(40),
      monthEndInventoryValueOkuYen: Array(12).fill(18),
      annualSalesUnits: 72
    });

    expect(result.averageMonthEndInventoryUnits).toBe(40);
    expect(result.unitTurnover).toBe(1.8);
    expect(result.salesPeriodMonths).toBeCloseTo(6.6667, 3);
    expect(result.inventoryDays).toBeCloseTo(202.7778, 3);
    expect(result.valueTurnover).toBeCloseTo(5, 3);
    expect(result.costOfSalesOkuYen).toBe(90);
    expect(result.annualSalesUnitsEstimated).toBe(false);
  });

  it("estimates annual sales units from sales and average sale price when units are not disclosed", () => {
    const result = calculateCompetitionKpi({
      fiscalYear: "2025年度",
      netSalesOkuYen: 100,
      grossProfitOkuYen: 25,
      monthEndInventoryUnits: Array(12).fill(25),
      monthEndInventoryValueOkuYen: Array(12).fill(12),
      averageSalePriceManYen: 5000
    });

    expect(result.annualSalesUnits).toBe(200);
    expect(result.annualSalesUnitsEstimated).toBe(true);
    expect(result.unitTurnover).toBe(8);
    expect(result.salesPeriodMonths).toBe(1.5);
  });
});
