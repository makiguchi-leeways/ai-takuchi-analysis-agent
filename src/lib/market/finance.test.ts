import { describe, expect, it } from "vitest";
import {
  calculateBorrowingCapacity,
  calculateLandAcquisitionLimit,
  compareRentVsBuy,
  monthlyLoanPayment
} from "./finance";

describe("housing finance calculators", () => {
  it("calculates borrowing capacity with equal principal and interest repayment", () => {
    const result = calculateBorrowingCapacity({
      householdIncomeManYen: 900,
      repaymentBurdenRate: 0.3,
      annualInterestRate: 0.011,
      repaymentYears: 35,
      downPaymentManYen: 500
    });

    expect(result.annualRepaymentCapacityManYen).toBe(270);
    expect(result.monthlyRepaymentCapacityManYen).toBe(22.5);
    expect(result.borrowingCapacityManYen).toBeCloseTo(7841, 0);
    expect(result.purchaseCapacityManYen).toBeCloseTo(8341, 0);
  });

  it("calculates land acquisition limit after costs and target gross margin", () => {
    const result = calculateLandAcquisitionLimit({
      purchaseCapacityManYen: 8000,
      buildingCostManYen: 3000,
      exteriorCostManYen: 250,
      closingCostManYen: 500,
      salesAdminCostManYen: 350,
      otherCostManYen: 100,
      targetGrossMarginRate: 0.18
    });

    expect(result.requiredGrossProfitManYen).toBe(1440);
    expect(result.totalNonLandCostManYen).toBe(4200);
    expect(result.landAcquisitionLimitManYen).toBe(2360);
    expect(result.recommendedSalePriceRangeManYen).toEqual([7600, 8400]);
  });

  it("compares rent continuation with purchase monthly burden", () => {
    const result = compareRentVsBuy({
      monthlyRentManYen: 18,
      commonServiceFeeManYen: 1.2,
      parkingFeeManYen: 1.8,
      renewalFeeManYen: 18,
      purchasePriceManYen: 6400,
      downPaymentManYen: 500,
      annualInterestRate: 0.011,
      repaymentYears: 35,
      annualPropertyTaxManYen: 18,
      monthlyRepairReserveManYen: 2.2,
      monthlyInsuranceManYen: 0.4,
      monthlyOtherMaintenanceManYen: 0.7
    });

    expect(result.rentMonthlyTotalManYen).toBeCloseTo(21.75, 2);
    expect(result.purchaseMonthlyTotalManYen).toBeCloseTo(21.73, 2);
    expect(result.monthlyDifferenceManYen).toBeCloseTo(-0.02, 2);
    expect(result.conversionPotential).toBe("high");
  });

  it("returns zero monthly payment when the principal is zero", () => {
    expect(monthlyLoanPayment(0, 0.011, 35)).toBe(0);
  });
});
