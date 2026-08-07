export interface CompetitionFinancials {
  fiscalYear: string;
  netSalesOkuYen: number;
  grossProfitOkuYen: number;
  costOfSalesOkuYen?: number;
  monthEndInventoryUnits: number[];
  monthEndInventoryValueOkuYen: number[];
  annualSalesUnits?: number;
  averageSalePriceManYen?: number;
}

export interface CompetitionKpi {
  fiscalYear: string;
  costOfSalesOkuYen: number;
  averageMonthEndInventoryUnits: number;
  averageInventoryValueOkuYen: number;
  annualSalesUnits: number | null;
  annualSalesUnitsEstimated: boolean;
  unitTurnover: number | null;
  inventoryDays: number | null;
  salesPeriodMonths: number | null;
  valueTurnover: number | null;
  sellThroughRate: number | null;
  grossMarginRate: number | null;
}

export function calculateCompetitionKpi(financials: CompetitionFinancials): CompetitionKpi {
  const costOfSalesOkuYen = financials.costOfSalesOkuYen ?? Math.max(0, financials.netSalesOkuYen - financials.grossProfitOkuYen);
  const averageMonthEndInventoryUnits = average(financials.monthEndInventoryUnits);
  const averageInventoryValueOkuYen = average(financials.monthEndInventoryValueOkuYen);
  const annualSalesUnits = resolveAnnualSalesUnits(financials);
  const unitTurnover = annualSalesUnits && averageMonthEndInventoryUnits > 0
    ? annualSalesUnits / averageMonthEndInventoryUnits
    : null;
  const inventoryDays = unitTurnover && unitTurnover > 0 ? 365 / unitTurnover : null;
  const salesPeriodMonths = unitTurnover && unitTurnover > 0 ? 12 / unitTurnover : null;
  const valueTurnover = averageInventoryValueOkuYen > 0 ? costOfSalesOkuYen / averageInventoryValueOkuYen : null;
  const sellThroughRate = annualSalesUnits && averageMonthEndInventoryUnits > 0
    ? (annualSalesUnits / (annualSalesUnits + averageMonthEndInventoryUnits)) * 100
    : null;

  return {
    fiscalYear: financials.fiscalYear,
    costOfSalesOkuYen,
    averageMonthEndInventoryUnits,
    averageInventoryValueOkuYen,
    annualSalesUnits,
    annualSalesUnitsEstimated: financials.annualSalesUnits === undefined,
    unitTurnover,
    inventoryDays,
    salesPeriodMonths,
    valueTurnover,
    sellThroughRate,
    grossMarginRate: financials.netSalesOkuYen > 0 ? (financials.grossProfitOkuYen / financials.netSalesOkuYen) * 100 : null
  };
}

export function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  return validValues.length > 0 ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length : 0;
}

function resolveAnnualSalesUnits(financials: CompetitionFinancials) {
  if (financials.annualSalesUnits !== undefined && Number.isFinite(financials.annualSalesUnits)) {
    return Math.max(0, financials.annualSalesUnits);
  }
  if (financials.averageSalePriceManYen && financials.averageSalePriceManYen > 0) {
    return Math.max(0, (financials.netSalesOkuYen * 10000) / financials.averageSalePriceManYen);
  }
  return null;
}
