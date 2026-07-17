import type {
  BorrowingCapacityInput,
  BorrowingCapacityResult,
  ConversionPotential,
  LandAcquisitionLimitInput,
  LandAcquisitionLimitResult,
  RentVsBuyInput,
  RentVsBuyResult
} from "./types";

const MONTHS_IN_YEAR = 12;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function monthlyLoanPayment(principalManYen: number, annualInterestRate: number, repaymentYears: number) {
  if (principalManYen <= 0) return 0;
  const months = repaymentYears * MONTHS_IN_YEAR;
  const monthlyRate = annualInterestRate / MONTHS_IN_YEAR;
  if (monthlyRate === 0) return principalManYen / months;
  return (principalManYen * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

export function calculateBorrowingCapacity(input: BorrowingCapacityInput): BorrowingCapacityResult {
  const annualRepaymentCapacityManYen = round(input.householdIncomeManYen * input.repaymentBurdenRate, 2);
  const monthlyRepaymentCapacityManYen = round(annualRepaymentCapacityManYen / MONTHS_IN_YEAR, 2);
  const months = input.repaymentYears * MONTHS_IN_YEAR;
  const monthlyRate = input.annualInterestRate / MONTHS_IN_YEAR;
  const borrowingCapacityManYen =
    monthlyRate === 0
      ? monthlyRepaymentCapacityManYen * months
      : monthlyRepaymentCapacityManYen * ((1 - (1 + monthlyRate) ** -months) / monthlyRate);

  return {
    annualRepaymentCapacityManYen,
    monthlyRepaymentCapacityManYen,
    borrowingCapacityManYen: round(borrowingCapacityManYen, 2),
    purchaseCapacityManYen: round(borrowingCapacityManYen + input.downPaymentManYen, 2)
  };
}

export function calculateLandAcquisitionLimit(input: LandAcquisitionLimitInput): LandAcquisitionLimitResult {
  const totalNonLandCostManYen = round(
    input.buildingCostManYen +
      input.exteriorCostManYen +
      input.closingCostManYen +
      input.salesAdminCostManYen +
      input.otherCostManYen,
    2
  );

  // MVP assumption: target gross profit is calculated against the purchase-capacity sale price.
  const requiredGrossProfitManYen = round(input.purchaseCapacityManYen * input.targetGrossMarginRate, 2);
  const landAcquisitionLimitManYen = round(
    Math.max(0, input.purchaseCapacityManYen - totalNonLandCostManYen - requiredGrossProfitManYen),
    2
  );

  return {
    minimumSalePriceManYen: round(input.purchaseCapacityManYen, 2),
    requiredGrossProfitManYen,
    totalNonLandCostManYen,
    landAcquisitionLimitManYen,
    recommendedSalePriceRangeManYen: [
      Math.round(input.purchaseCapacityManYen * 0.95),
      Math.round(input.purchaseCapacityManYen * 1.05)
    ]
  };
}

export function compareRentVsBuy(input: RentVsBuyInput): RentVsBuyResult {
  const rentMonthlyTotalManYen = round(
    input.monthlyRentManYen +
      input.commonServiceFeeManYen +
      input.parkingFeeManYen +
      input.renewalFeeManYen / 24,
    2
  );
  const loanPrincipalManYen = Math.max(0, input.purchasePriceManYen - input.downPaymentManYen);
  const loanMonthlyPaymentManYen = round(
    monthlyLoanPayment(loanPrincipalManYen, input.annualInterestRate, input.repaymentYears),
    2
  );
  const purchaseMonthlyTotalManYen = round(
    loanMonthlyPaymentManYen +
      input.annualPropertyTaxManYen / 12 +
      input.monthlyRepairReserveManYen +
      input.monthlyInsuranceManYen +
      input.monthlyOtherMaintenanceManYen,
    2
  );
  const monthlyDifferenceManYen = round(purchaseMonthlyTotalManYen - rentMonthlyTotalManYen, 2);
  const rentLifetimeCostManYen = round(rentMonthlyTotalManYen * input.repaymentYears * MONTHS_IN_YEAR, 0);
  const purchaseLifetimeCostManYen = round(purchaseMonthlyTotalManYen * input.repaymentYears * MONTHS_IN_YEAR, 0);
  const conversionPotential: ConversionPotential =
    monthlyDifferenceManYen <= 1 ? "high" : monthlyDifferenceManYen <= 4 ? "medium" : "low";

  return {
    rentMonthlyTotalManYen,
    loanMonthlyPaymentManYen,
    purchaseMonthlyTotalManYen,
    monthlyDifferenceManYen,
    rentLifetimeCostManYen,
    purchaseLifetimeCostManYen,
    conversionPotential,
    salesTalk:
      conversionPotential === "high"
        ? "賃貸継続と購入後負担の差が小さいため、資産形成と住環境改善を合わせた購入転換提案が有効です。"
        : conversionPotential === "medium"
          ? "月額負担はやや増えるため、住宅ローン控除や仕様価値を含めた比較提案が必要です。"
          : "現状賃料との差が大きいため、価格帯または土地面積を抑えた商品提案を優先してください。"
  };
}
